from fastapi import FastAPI, HTTPException, Form, UploadFile, File
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


# API ROUTES


@app.post("/api/batches")
def create_batch(batch: BatchCreate):
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
def start_transport(event: TransportStart):
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
def arrive_transport(batch_id: str, event: TransportArrive):
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
def submit_quality_check(qc: QualityCheck):
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
def storage_check_in(log: StorageLogCreate):
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
def create_purchase(purchase: PurchaseCreate):
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
def update_price(batch_id: str, price: PriceUpdate):
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
def storage_check_out(batch_id: str):
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
            supabase.table("batches")
            .select("*,quality_checks(*),storage_logs(*),supply_chain_events(*)")
            .eq("batch_id", batch_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Batch history not found")
        return {
            "status": "Success",
            "Full history": response.data[0]
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


@app.post("/api/upload-certificate", summary="Upload certificate to Supabase Storage") #route to upload certificate
async def upload_certificate(batch_id: str = Form(...), file: UploadFile = File(...)):
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


@app.get("/")
def test():
    return {"status": "API running"}