import os
from fastapi import FastAPI, HTTPException, Form, UploadFile, File, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from pydantic import BaseModel, Field
import uuid
from database import supabase
from utils import generate_qr_base64
from datetime import datetime

app = FastAPI(title="Agri Supply Chain API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth Dependencies ─────────────────────────────────────────────────────────

def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Extracts and validates the Supabase JWT from the Authorization header.
    Raises 401 if the token is missing or invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated. Please log in.")
    token = authorization.split(" ", 1)[1]
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")
        return user_response.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


def get_admin_user(current_user=Depends(get_current_user)):
    """
    Extends get_current_user — additionally enforces that the caller has role=admin.
    """
    role = current_user.user_metadata.get("role", "")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Access denied. Admin role required.")
    return current_user

class PurchaseCreate(BaseModel):
    batch_id: str = Field(...)
    buyer_id: str = Field(...)
    final_price_per_kg: float = Field(..., gt=0)
    total_weight: float = Field(..., gt=0)

class PriceUpdate(BaseModel):
    base_price_per_kg: float = Field(..., gt=0)

class BatchCreate(BaseModel):
    farmer_id: str = Field(...)
    crop_type: str = Field(...)
    initial_weight: float = Field(..., gt=0)
    base_price_per_kg: float = Field(..., gt=0)

class TransportStart(BaseModel):
    batch_id: str = Field(...)
    operator_id: str = Field(...)
    location_name: str = Field(...) 
    transport_mode: str = Field(..., pattern="^(Heavy Truck|Electric|Train)$")

class TransportArrive(BaseModel):
    destination_name: str = Field(...)
    distance_km: float = Field(..., gt=0)

class QualityCheck(BaseModel):
    batch_id: str = Field(...)
    inspector_id: str = Field(...)
    moisture_percentage: float = Field(..., ge=0, le=100)
    grade: str = Field(..., pattern="^(A|B|C)$")
    contamination_flag: bool
    certificate_url: str

class StorageLogCreate(BaseModel):
    batch_id: str = Field(...)
    manager_id: str = Field(...) 
    facility_name: str = Field(...)
    temperature: float = Field(...)
    humidity: float = Field(...)

class AdminUserCreate(BaseModel):
    email: str = Field(...)
    password: str = Field(..., min_length=6)
    full_name: str = Field(...)
    role: str = Field(..., pattern="^(farmer|inspector|transporter|warehouse_manager|buyer|admin|auditor)$")

class AdminUserStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|inactive)$")
# API ROUTES


@app.post("/api/batches")
def create_batch(batch: BatchCreate, _user=Depends(get_current_user)):
    try:
        if not batch.crop_type:
            raise HTTPException(status_code=400, detail="Crop type cannot be empty")
        if not batch.initial_weight or not batch.base_price_per_kg:
            raise HTTPException(status_code=400, detail="Initial weight and base price per kg are mandatory")
        if batch.initial_weight <= 0:
            raise HTTPException(status_code=400, detail="Weight must be positive")
            
        response = (
            supabase.table("batches")
            .insert({
                "farmer_id": batch.farmer_id,
                "crop_type": batch.crop_type,
                "initial_weight": batch.initial_weight,
                "base_price_per_kg": batch.base_price_per_kg
            })
            .execute()
        )

        new_batch = response.data[0]
        batch_id = new_batch["batch_id"]
        qr_code = generate_qr_base64(batch_id)

        return {
            "message": "Batch created successfully",
            "batch_id": batch_id,
            "qr_code": qr_code
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/transport/start", summary="Log batch departure")
def start_transport(event: TransportStart, _user=Depends(get_current_user)):
    try:
        response = (
            supabase.table("supply_chain_events")
            .insert({
                "batch_id": event.batch_id,
                "operator_id": event.operator_id,
                "location_name": event.location_name,
                "transport_mode": event.transport_mode,
                "event_type": "departed",
                "departure_time": datetime.now().isoformat()
            })
            .execute()
        )
        return {"message": "Transport started", "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.patch("/api/transport/arrive/{batch_id}", summary="Log batch arrival and distance")
def arrive_transport(batch_id: str, event: TransportArrive, _user=Depends(get_current_user)):
    try:
        response = (
            supabase.table("supply_chain_events")
            .update({
                "destination_name": event.destination_name,
                "distance_km": event.distance_km,
                "event_type": "delivered",
                "arrival_time": datetime.now().isoformat()
            })
            .eq("batch_id", batch_id)
            .is_("arrival_time", "null") 
            .execute()
        )
        
        if not response.data or len(response.data) == 0:
            return {"message": f"No active transport session found for Batch {batch_id}"}

        return {"message": "Transport arrival logged. Carbon emitted calculated successfully."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/quality")
def submit_quality_check(qc: QualityCheck, _user=Depends(get_current_user)):
    try:
        response = (
            supabase.table("quality_checks")
            .insert({
                "batch_id": qc.batch_id,
                "inspector_id": qc.inspector_id,
                "moisture_percentage": qc.moisture_percentage,
                "grade": qc.grade,
                "contamination_flag": qc.contamination_flag,
                "certificate_url": qc.certificate_url
            })
            .execute()
        )
        return {
            "message": "Quality Check submitted successfully",
            "data": response.data[0]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/storage/check-in")
def storage_check_in(log: StorageLogCreate, _user=Depends(get_current_user)):
    try:
        response = (
            supabase.table("storage_logs")
            .insert({
                "batch_id": log.batch_id,
                "manager_id": log.manager_id, 
                "facility_name": log.facility_name,
                "temperature": log.temperature,
                "humidity": log.humidity,
                "entry_timestamp": datetime.now().isoformat()
            })
            .execute()
        ) 
        return {"message": "Batch Checked into Facility", "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/purchases", summary="Handles Buyer checkout")
def create_purchase(purchase: PurchaseCreate, _user=Depends(get_current_user)):
    final_amount = purchase.final_price_per_kg * purchase.total_weight
    try:
        response = (
            supabase.table("purchases")
            .insert({
                "batch_id": purchase.batch_id,
                "buyer_id": purchase.buyer_id,
                "final_price_per_kg": purchase.final_price_per_kg,
                "total_weight": purchase.total_weight,
                "total_amount": final_amount
            })
            .execute()
        )
        return {
            "message": "Purchase Successful!",
            "Order_details": response.data[0]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.patch("/api/batches/{batch_id}", summary="Update base_price_per_kg")
def update_price(batch_id: str, price: PriceUpdate, _user=Depends(get_current_user)):
    try:
        response = (
            supabase.table("batches")
            .update({"base_price_per_kg": price.base_price_per_kg})
            .eq("batch_id", batch_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=400, detail="Batch not found")

        return {
            "message": "Price updated successfully",
            "new_price": price.base_price_per_kg
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.patch("/api/storage/check_out/{batch_id}")
def storage_check_out(batch_id: str, _user=Depends(get_current_user)):
    try:
        response = (
            supabase.table("storage_logs")
            .update({"exit_timestamp": datetime.now().isoformat()})
            .eq("batch_id", batch_id)
            .is_("exit_timestamp", "null")
            .execute()
        )
        if not response.data or len(response.data) == 0:
            return {"message": f"No Active Storage Session for Batch {batch_id}"}

        return {"message": "Storage Check_out Successful"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/traceability/{batch_id}", summary="get full lifecycle of batch") #call to trace the entire batch lifecycle
def get_trace(batch_id: str):
    try:
        response = (
            supabase.table("full_batch_timeline")
            .select("*")
            .eq("batch_id", batch_id)
            .order("timestamp", desc=False)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Batch history not found")
        return {
            "status": "Success",
            "batch_id": batch_id,
            "timeline": response.data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/marketplace") #marketplace view
def get_marketplace(crop_type: Optional[str] = None, min_carbon: Optional[float] = None):
    try:
        query = supabase.table("buyer_marketplace").select("*")
        
        if crop_type:
            query = query.eq("crop_type", crop_type)
        if min_carbon is not None:
            query = query.lte("total_carbon_footprint", min_carbon)
            
        response = query.execute()

        return {
            "results": response.data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/batches/farmer/{farmer_id}") # farmer history
def get_farmer_batches(farmer_id: str):
    try:
        response = supabase.table("batches").select("*").eq("farmer_id", farmer_id).execute()
        return {"batches": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/events/operator/{operator_id}") #transport operator history
def get_operator_events(operator_id: str):
    try:
        response = supabase.table("supply_chain_events").select("*").eq("operator_id", operator_id).execute()
        return {"events": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/quality/inspector/{inspector_id}") #quality inspector history
def get_quality_checks(inspector_id: str):
    try:
        response = supabase.table("quality_checks").select("*").eq("inspector_id", inspector_id).execute()
        return {"quality_checks": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/storage/manager/{manager_id}") # storage manager history
def get_storage_history(manager_id: str):
    try:
        response = (
            supabase.table("storage_logs")
            .select("*")
            .eq("manager_id", manager_id) 
            .execute()
        )
        return {"storage_history": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/purchases/buyer/{buyer_id}") #buyer history
def get_purchase_history(buyer_id: str):
    try:
        response = (
            supabase.table("purchases")
            .select("*")
            .eq("buyer_id", buyer_id)
            .execute()
        )
        return {
            "buyer_purchase_history": response.data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/analytics/admin-dashboard/", summary="fetch system wide analtyics") #admin dashboard call
def get_admin_dashboard():
    try:
        summary = supabase.table("admin_system_summary").select("*").execute()
        top_farmers = supabase.table("admin_top_farmers").select("*").execute()
        carbon_metrics = supabase.table("admin_carbon_metrics").select("*").execute()

        purchases = supabase.table("purchases").select("total_amount").execute()
        # protect against None values in total_amount securely
        total_revenue = sum(p.get('total_amount', 0) or 0 for p in purchases.data)
        net_profit = total_revenue * 0.05

        return {
            "system_summary": summary.data,
            "top_farmers": top_farmers.data,
            "carbon_footprint_stats": carbon_metrics.data,
            "financials": {
                "total_market_volume": total_revenue,
                "platform_net_profit": round(net_profit, 2),
                "commission_rate": "5%"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Analytics Error: {str(e)}")


@app.post("/api/upload-certificate", summary="Upload certificate to Supabase Storage")
async def upload_certificate(batch_id: str = Form(...), file: UploadFile = File(...), _user=Depends(get_current_user)):
    try:
        if not file.filename or "." not in file.filename:
            raise HTTPException(status_code=400, detail="Invalid file: No extension found")
            
        file_extension = file.filename.split(".")[-1].lower()
        allowed_extensions = ["pdf", "png", "jpg", "jpeg"]
        
        if file_extension not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {allowed_extensions}")

        unique_filename = f"{batch_id}/{uuid.uuid4()}.{file_extension}"
        file_content = await file.read()
        
        supabase.storage.from_("certificates").upload(
            path=unique_filename,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        public_url = supabase.storage.from_("certificates").get_public_url(unique_filename)
        
        return {
            "message": "Upload successful",
            "batch_id": batch_id,
            "certificate_url": public_url
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Upload Failed: {str(e)}")


# ── ADMIN ENDPOINTS ────────────────────────────────────────────────────────────

@app.get("/api/admin/users", summary="Get all platform users natively from Auth")
def get_all_users(_user=Depends(get_admin_user)):
    """
    Checks Supabase Auth to retrieve active users and their metadata.
    """
    try:
        auth_users = supabase.auth.admin.list_users()
        users_list = []
        for u in auth_users:
            users_list.append({
                "id": u.id,
                "email": u.email,
                "role": u.user_metadata.get("role", "unknown"),
                "full_name": u.user_metadata.get("full_name", ""),
                "status": u.user_metadata.get("status", "active"),
                "created_at": str(u.created_at)
            })
        # Sort newest first
        users_list.sort(key=lambda x: x["created_at"], reverse=True)
        return {"users": users_list, "total": len(users_list)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/admin/alerts", summary="Get system-generated alerts from business rules")
def get_system_alerts(_user=Depends(get_admin_user)):
    """
    Auto-generates alerts by applying business rules against existing tables.
    No dedicated alerts table needed — derived on demand.
    """
    try:
        alerts = []

        # Alert 1: Contaminated batches (Critical)
        contam = supabase.table("quality_checks").select(
            "batch_id, created_at, inspector_id"
        ).eq("contamination_flag", True).execute()
        for q in contam.data:
            alerts.append({
                "severity": "Critical",
                "description": "Contamination flagged by inspector",
                "batch_id": q["batch_id"],
                "time": q["created_at"],
                "resolved": False
            })

        # Alert 2: Grade C batches (Warning)
        grade_c = supabase.table("quality_checks").select(
            "batch_id, created_at"
        ).eq("grade", "C").execute()
        for q in grade_c.data:
            alerts.append({
                "severity": "Warning",
                "description": "Grade C batch — below acceptable standard",
                "batch_id": q["batch_id"],
                "time": q["created_at"],
                "resolved": False
            })

        # Alert 3: Batches with no quality check submitted (Warning)
        all_batches = supabase.table("batches").select("batch_id, created_at").execute()
        checked_ids = {
            q["batch_id"]
            for q in supabase.table("quality_checks").select("batch_id").execute().data
        }
        for b in all_batches.data:
            if b["batch_id"] not in checked_ids:
                alerts.append({
                    "severity": "Warning",
                    "description": "No quality check submitted for this batch",
                    "batch_id": b["batch_id"],
                    "time": b["created_at"],
                    "resolved": False
                })

        # Alert 4: High-carbon transport events (Warning, threshold: 80 kg CO₂)
        high_carbon = supabase.table("supply_chain_events").select(
            "batch_id, carbon_emitted, departure_time"
        ).gt("carbon_emitted", 80).execute()
        for e in (high_carbon.data or []):
            alerts.append({
                "severity": "Warning",
                "description": f"High carbon emission: {e.get('carbon_emitted')} kg CO₂",
                "batch_id": e["batch_id"],
                "time": e.get("departure_time"),
                "resolved": False
            })

        # Sort newest first
        alerts.sort(key=lambda x: x.get("time") or "", reverse=True)
        return {"alerts": alerts, "total": len(alerts)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/admin/activity", summary="Unified cross-table activity feed")
def get_activity_feed(limit: int = 20, _user=Depends(get_admin_user)):
    """
    Combines the 5 operational tables into a single chronological feed.
    Uses correct timestamps: created_at for batches/quality/purchases,
    event_time for supply_chain_events, entry_timestamp for storage_logs.
    """
    try:
        feed = []

        batches = supabase.table("batches").select(
            "batch_id, farmer_id, crop_type, created_at"
        ).order("created_at", desc=True).limit(limit).execute()
        for b in batches.data:
            feed.append({
                "time": b["created_at"], "actor": b["farmer_id"],
                "role": "Farmer", "action": "Created batch",
                "target": b["batch_id"], "severity": "Normal"
            })

        quality = supabase.table("quality_checks").select(
            "batch_id, inspector_id, grade, contamination_flag, created_at"
        ).order("created_at", desc=True).limit(limit).execute()
        for q in quality.data:
            sev = "Critical" if q["contamination_flag"] else ("Warning" if q["grade"] == "C" else "Normal")
            feed.append({
                "time": q["created_at"], "actor": q["inspector_id"],
                "role": "Inspector", "action": f"Quality check (Grade {q['grade']})",
                "target": q["batch_id"], "severity": sev
            })

        events = supabase.table("supply_chain_events").select(
            "batch_id, operator_id, event_type, location_name, departure_time"
        ).order("departure_time", desc=True).limit(limit).execute()
        for e in events.data:
            feed.append({
                "time": e["departure_time"], "actor": e["operator_id"],
                "role": "Transporter", "action": f"{e['event_type']} at {e['location_name']}",
                "target": e["batch_id"], "severity": "Normal"
            })

        storage = supabase.table("storage_logs").select(
            "batch_id, manager_id, facility_name, entry_timestamp"
        ).order("entry_timestamp", desc=True).limit(limit).execute()
        for s in storage.data:
            feed.append({
                "time": s["entry_timestamp"], "actor": s["manager_id"],
                "role": "Warehouse", "action": f"Check-in at {s['facility_name']}",
                "target": s["batch_id"], "severity": "Normal"
            })

        purchases = supabase.table("purchases").select(
            "batch_id, buyer_id, total_amount, purchased_at"
        ).order("purchased_at", desc=True).limit(limit).execute()
        for p in purchases.data:
            feed.append({
                "time": p["purchased_at"], "actor": p["buyer_id"],
                "role": "Buyer", "action": f"Purchase — ₹{p.get('total_amount', 0)}",
                "target": p["batch_id"], "severity": "Normal"
            })

        feed.sort(key=lambda x: x.get("time") or "", reverse=True)
        return {"activity": feed[:limit]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/admin/analytics", summary="Admin analytics aggregates")
def get_admin_analytics(_user=Depends(get_admin_user)):
    """
    Computes: (1) average quality score per crop type, (2) avg + total carbon
    per transport mode, (3) batch count per crop type. All derived from existing tables.
    """
    try:
        # Quality by crop — join batches + quality_checks in Python
        batches_data = supabase.table("batches").select("batch_id, crop_type").execute()
        quality_data = supabase.table("quality_checks").select(
            "batch_id, grade, moisture_percentage"
        ).execute()

        crop_map = {b["batch_id"]: b["crop_type"] for b in batches_data.data}
        grade_score = {"A": 100, "B": 70, "C": 40}
        quality_by_crop: dict = {}
        for q in quality_data.data:
            crop = crop_map.get(q["batch_id"], "Unknown")
            if crop not in quality_by_crop:
                quality_by_crop[crop] = {"scores": [], "moisture": []}
            quality_by_crop[crop]["scores"].append(grade_score.get(q["grade"], 0))
            quality_by_crop[crop]["moisture"].append(q.get("moisture_percentage") or 0)

        quality_by_crop_list = [
            {
                "crop": crop,
                "avg_quality_score": round(sum(v["scores"]) / len(v["scores"]), 1),
                "avg_moisture": round(sum(v["moisture"]) / len(v["moisture"]), 1),
                "count": len(v["scores"])
            }
            for crop, v in quality_by_crop.items() if v["scores"]
        ]

        # Carbon by transport mode
        events_data = supabase.table("supply_chain_events").select(
            "transport_mode, carbon_emitted"
        ).execute()
        carbon_by_mode: dict = {}
        for e in events_data.data:
            mode = e.get("transport_mode") or "Unknown"
            carbon = e.get("carbon_emitted") or 0
            if mode not in carbon_by_mode:
                carbon_by_mode[mode] = []
            carbon_by_mode[mode].append(carbon)

        carbon_by_mode_list = [
            {
                "mode": m,
                "avg_carbon": round(sum(v) / len(v), 1),
                "total_carbon": round(sum(v), 1),
                "trip_count": len(v)
            }
            for m, v in carbon_by_mode.items() if v
        ]

        # Batch count by crop type
        crop_count: dict = {}
        for b in batches_data.data:
            ct = b.get("crop_type") or "Unknown"
            crop_count[ct] = crop_count.get(ct, 0) + 1
        batches_by_crop = [{"crop": k, "count": v} for k, v in crop_count.items()]

        return {
            "quality_by_crop": quality_by_crop_list,
            "carbon_by_mode": carbon_by_mode_list,
            "batches_by_crop": batches_by_crop,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── AUDITOR ENDPOINTS ──────────────────────────────────────────────────────────

@app.get("/api/auditor/logs", summary="Full audit log from audit_logs table")
def get_audit_logs(_user=Depends(get_current_user)):
    """
    Reads from the audit_logs table, which is populated automatically by the
    log_tampering_attempts() trigger — no manual aggregation needed.
    """
    try:
        response = (
            supabase.table("audit_logs")
            .select("*")
            .execute()
        )
        # Sort by confirmed audit_logs timestamp column: changed_at
        logs = sorted(
            response.data,
            key=lambda x: x.get("changed_at") or "",
            reverse=True
        )
        return {"logs": logs, "total": len(logs)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/auditor/integrity", summary="Run 5 automated data integrity checks")
def get_integrity_checks(_user=Depends(get_current_user)):
    """
    Runs 5 checks against existing tables:
    1. Quality check coverage  2. Transport event coverage
    3. Carbon log completeness 4. Purchase referential integrity
    5. Duplicate quality check detection
    """
    try:
        from collections import Counter

        batches   = supabase.table("batches").select("batch_id, created_at, status").execute().data
        quality   = supabase.table("quality_checks").select("batch_id").execute().data
        events    = supabase.table("supply_chain_events").select("batch_id, carbon_emitted").execute().data
        storage   = supabase.table("storage_logs").select("batch_id, carbon_emitted").execute().data
        purchases = supabase.table("purchases").select("batch_id").execute().data

        batch_ids    = {b["batch_id"] for b in batches}
        quality_ids  = {q["batch_id"] for q in quality}
        event_ids    = {e["batch_id"] for e in events}
        purchase_ids = {p["batch_id"] for p in purchases}

        checks = []

        # Check 1: Batches without any quality check
        no_qc = batch_ids - quality_ids
        checks.append({
            "name": "Quality check coverage",
            "status": "Pass" if not no_qc else "Fail",
            "detail": f"All {len(batch_ids)} batches have quality checks" if not no_qc
                      else f"{len(no_qc)} batch(es) missing quality check"
        })

        # Check 2: Batches with no transport event
        no_event = batch_ids - event_ids
        checks.append({
            "name": "Transport event coverage",
            "status": "Pass" if not no_event else "Fail",
            "detail": "All batches have at least one transport event" if not no_event
                      else f"{len(no_event)} batch(es) missing transport events"
        })

        # Check 3: Storage logs missing carbon values
        missing_carbon = [s for s in storage if s.get("carbon_emitted") is None]
        checks.append({
            "name": "Carbon log completeness",
            "status": "Pass" if not missing_carbon else "Fail",
            "detail": "All storage logs have carbon data" if not missing_carbon
                      else f"{len(missing_carbon)} storage log(s) missing carbon value"
        })

        # Check 4: Purchases referencing non-existent batches
        orphan_purchases = purchase_ids - batch_ids
        checks.append({
            "name": "Purchase referential integrity",
            "status": "Pass" if not orphan_purchases else "Fail",
            "detail": "All purchases reference valid batches" if not orphan_purchases
                      else f"{len(orphan_purchases)} purchase(s) reference unknown batch IDs"
        })

        # Check 5: Duplicate quality checks per batch
        qc_counts = Counter(q["batch_id"] for q in quality)
        duplicates = {bid: cnt for bid, cnt in qc_counts.items() if cnt > 1}
        checks.append({
            "name": "Duplicate quality check detection",
            "status": "Pass" if not duplicates else "Warning",
            "detail": "No duplicate quality checks found" if not duplicates
                      else f"{len(duplicates)} batch(es) have multiple quality checks"
        })

        passed = sum(1 for c in checks if c["status"] == "Pass")
        return {"checks": checks, "passed": passed, "total": len(checks)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── USER MANAGEMENT ENDPOINTS ──────────────────────────────────────────────────

@app.post("/api/admin/users", summary="Create a new user via Supabase Auth")
def create_admin_user(user: AdminUserCreate, _user=Depends(get_admin_user)):
    try:
        res = supabase.auth.admin.create_user({
            "email": user.email,
            "password": user.password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": user.full_name,
                "role": user.role
            }
        })
        return {"status": "success", "user_id": res.user.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.patch("/api/admin/users/{user_id}/status", summary="Activate or deactivate user")
def update_user_status(user_id: str, payload: AdminUserStatusUpdate, _user=Depends(get_admin_user)):
    try:
        # Update auth metadata to cleanly block logins and toggle UI status
        supabase.auth.admin.update_user_by_id(user_id, {"user_metadata": {"status": payload.status}})
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/admin/users/{user_id}", summary="Delete user if no history")
def delete_admin_user(user_id: str, _user=Depends(get_admin_user)):
    try:
        # Constraint: Check historical records across all tables
        b = supabase.table("batches").select("batch_id").eq("farmer_id", user_id).limit(1).execute()
        q = supabase.table("quality_checks").select("batch_id").eq("inspector_id", user_id).limit(1).execute()
        e = supabase.table("supply_chain_events").select("batch_id").eq("operator_id", user_id).limit(1).execute()
        s = supabase.table("storage_logs").select("batch_id").eq("manager_id", user_id).limit(1).execute()
        p = supabase.table("purchases").select("batch_id").eq("buyer_id", user_id).limit(1).execute()

        if b.data or q.data or e.data or s.data or p.data:
            raise HTTPException(
                status_code=400, 
                detail="User cannot be deleted because they have active historical records. Please deactivate them instead."
            )
        
        # If clean, carefully delete from Supabase Auth
        supabase.auth.admin.delete_user(user_id)
        # Attempt public table cleanup to act as an explicit safety net
        supabase.table("users").delete().eq("id", user_id).execute()
        
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/")
def test():
    return {"status": "API running"}