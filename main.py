from fastapi import FastAPI,HTTPException
from pydantic import BaseModel
from database import supabase
from utils import  generate_qr_base64
from typing import Optional
from uuid import UUID
from datetime import datetime

app= FastAPI(title=" Agri supply chain API")

class BatchCreate(BaseModel):
    farmer_id: UUID
    crop_type:str
    initial_weight:float
@app.post("/api/batches")
def create_batch(batch: BatchCreate):
    # 1. First, get the data out of the DB
    try:
        res = supabase.table("batches").insert({
            "farmer_id": str(batch.farmer_id),
            "crop_type": batch.crop_type,
            "initial_weight": batch.initial_weight
        }).execute()
        
        if not res.data:
            raise Exception("Insert failed - no data returned")
        
        new_batch = res.data[0]
        # Use .get() to avoid KeyError if Member 1 named it 'id'
        batch_id = new_batch.get("batch_id") or new_batch.get("id")
        
    except Exception as e:
        print(f"DB PHASE ERROR: {e}")
        raise HTTPException(status_code=500, detail="DB Error")

    # 2. Second, try the QR generation separately
    try:
        print(f"DEBUG: Starting QR gen for {batch_id}")
        qr_image = generate_qr_base64(str(batch_id))
        print("DEBUG: QR gen successful")
    except Exception as e:
        print(f"QR PHASE ERROR: {e}")
        # Even if QR fails, we know the DB part worked
        return {"message": "Data saved, but QR failed", "batch_id": batch_id}

    return {
        "message": "Batch created successfully",
        "batch_id": batch_id,
        "qr_code": qr_image
    }


class SupplyChainEvent(BaseModel):
    batch_id:UUID
    operator_id:UUID
    location_name:str
    event_type:str
    distance_km:float =0.0

@app.post("/api/events",summary="Log a new supply chain event")
def log_event(event:SupplyChainEvent):
    try:
        response =(
            supabase.table("supply_chain_events")
            .insert({
                "batch_id":str(event.batch_id),
                "operator_id":str(event.operator_id),
                "location_name":event.location_name,
                "event_type":event.event_type,
                "distance_km": event.distance_km
                })
            .execute()
        )

        #carbon emmision automatically calculated by postgresql
        return{
            "message":f"Event'{event.event_type}' logged successfully.",
            "data": response.data[0]

        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class QualityCheck(BaseModel):
    batch_id:UUID
    inspector_id:UUID
    moisture_percentage:float
    grade:str
    contamination_flag:bool
    certificate_url:str

@app.post("/api/quality", summary="Submit a quality check")
def submit_quality_check(qc:QualityCheck):
    try:
        response=(
            supabase.table("quality_checks")
            .insert({
                "batch_id":str(qc.batch_id),
                "inspector_id":str(qc.inspector_id),
                "moisture_percentage":qc.moisture_percentage,
                "grade":qc.grade,
                "contamination_flag":qc.contamination_flag,
                "certificate_url":qc.certificate_url
            })

            .execute()
        )

        return {
            "message":"Quality check submitted securely.",
            "data":response.data[0]
        }

    except Exception as e:
        raise HTTPException(status_code=400,detail=str(e))
    

class StorageSchema(BaseModel):
    batch_id:UUID
    facility_name:str
    temperature:float
    humidity:float

@app.post("/api/storage/check-in", summary="Log a batch arriving at a warehouse")
def storage_check_in(entry: StorageSchema):
    try:
        # 1. Create the new storage log (entry_timestamp defaults to NOW())
        supabase.table("storage_logs").insert({
            "batch_id": str(entry.batch_id),
            "facility_name": entry.facility_name,
            "temperature": entry.temperature,
            "humidity": entry.humidity
        }).execute()
        
        # 2. Update the main batch status to 'stored'. 
        # CRITICAL: Always use "batch_id" to match the DB schema perfectly!
        supabase.table("batches").update({"status": "stored"}).eq("batch_id", entry.batch_id).execute()
        
        return {"message": "Batch successfully checked into storage."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    


class StorageCheckOut(BaseModel):
    log_id: str # The specific ID of the storage_logs row

@app.post("/api/storage/check-out", summary="Log a batch leaving storage")
def storage_check_out(exit_data: StorageCheckOut):
    try:
        # Update the exit time to right now
        current_time = datetime.now().isoformat()
        
        # Member 1's trigger will fire right here and do the carbon math!
        response = supabase.table("storage_logs").update({
            "exit_timestamp": current_time
        }).eq("id", exit_data.log_id).execute()
        
        return {"message": "Batch checked out. Carbon calculated.", "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))




@app.get("/api/marketplace",summary="Get batches for the buyer marketplace")
def get_marketplace(
    crop_type:Optional[str] = None,
    min_quality:int = 0,
    max_carbon:float = 1000.0
):
    try:
        query=supabase.table("buyer_marketplace").select("*")

        if crop_type:
            query=query.eq("crop_type",crop_type)

        query = query.gte("quality_score",min_quality)
        query = query.lte("total_carbon_footprint",max_carbon)

        response= query.execute()
        return{"data":response.data}

    except Exception as e:
        raise HTTPException(status_code=400,detail=str(e))


@app.get("/api/traceability/{batch_id}")
def get_tracability(batch_id: UUID): # FastAPI validates it's a UUID here
    try:
        # STEP 1: Explicitly cast to string for the DB driver
        b_id_str = str(batch_id)
        
        # STEP 2: Use the string in all queries
        # IMPORTANT: Ensure the column name is 'batch_id' in your Supabase table
        batch_res = supabase.table("batches").select("*").eq("batch_id", b_id_str).execute()
        
        if not batch_res.data:
            raise HTTPException(status_code=404, detail="Batch not found")

        events_res = supabase.table("supply_chain_events").select("*").eq("batch_id", b_id_str).order("event_time").execute()
        quality_res = supabase.table("quality_checks").select("*").eq("batch_id", b_id_str).execute()

        return {
            "batch_info": batch_res.data[0],
            "timeline": events_res.data,
            "quality_reports": quality_res.data
        }
    except Exception as e:
        print(f"TRACEABILITY ERROR: {e}")
        raise HTTPException(status_code=500, detail="Internal connection error to Database")

@app.get("/api/admin/summary", summary="Get system-wide analytics for the Admin Dashboard")
def get_admin_summary():
    try:
        # Fetch everything from Member 1's pre-calculated view
        # No complex joins or math needed in Python!
        response = supabase.table("admin_system_summary").select("*").execute()
        
        # Guard against empty data if the system is brand new
        if not response.data:
            return {
                "message": "No data available yet.",
                "data": []
            }

        return {
            "message": "Analytics fetched successfully",
            "data": response.data
        }
        
    except Exception as e:
        status_code = getattr(e, "status_code", 500)
        raise HTTPException(status_code=status_code, detail=str(e))


#for testing
@app.get("/")
def read_root():
    return{"status":"API is running!"}