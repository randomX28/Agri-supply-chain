from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from pydantic import BaseModel
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


class BatchCreate(BaseModel):
    farmer_id: str
    crop_type: str
    initial_weight: float


@app.post("/api/batches")
def create_batch(batch: BatchCreate):

    try:

        response = (
            supabase.table("batches")
            .insert({
                "farmer_id": batch.farmer_id,
                "crop_type": batch.crop_type,
                "initial_weight": batch.initial_weight
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

class SupplyChainEvent(BaseModel):
    batch_id:str
    operator_id:str
    location_name:str
    event_type:str
    distance_km:float=0.0

@app.post("/api/events")
def log_event(event: SupplyChainEvent):
    try:
        response=(
            supabase.table("supply_chain_events")
            .insert(
                {"batch_id": event.batch_id,
                "operator_id":event.operator_id,
                "location_name":event.location_name,
                "event_type":event.event_type,
                "distance_km":event.distance_km}
            )
            .execute()
        )
        return{
            "message": f"Event '{event.event_type}' logged successfully",
            "data": response.data[0]
        }

    except Exception as e:
            raise HTTPException(status_code=400, detail = str(e))

class QualityCheck(BaseModel):
    batch_id:str
    inspector_id: str
    moisture_percentage:float
    grade:str
    contamination_flag:bool
    certificate_url:str

@app.post("/api/quality")
def submit_quality_check(qc: QualityCheck):
    try:
        response=(
            supabase.table("quality_checks")
            .insert(
                {
                    "batch_id":qc.batch_id,
                    "inspector_id":qc.inspector_id,
                    "moisture_percentage": qc.moisture_percentage,
                    "grade": qc.grade,
                    "contamination_flag": qc.contamination_flag,
                    "certificate_url": qc.certificate_url
                }
            )
            .execute()
        )

        return{
            "message": "Quality Check submitted successfully",
            "data": response.data[0]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail= str(e))

class StorageLogCreate(BaseModel):
    batch_id:str
    facility_name:str
    temperature:float
    humidity:float

@app.post("/api/storage/check-in")
def storage_check_in(log: StorageLogCreate):
    try:

        response =(
            supabase.table("storage_logs")
            .insert(
                {
                    "batch_id":log.batch_id,
                    "facility_name": log.facility_name,
                    "temperature":log.temperature,
                    "humidity":log.humidity,
                    "entry_timestamp":datetime.now().isoformat()
                }
            )
            .execute()
        ) 

        return{
        "message": "Batch Checked into Facility",
        "data": response.data[0]
        }

    except Exception as e:
        raise HTTPException(status_code= 400, detail= str(e))


@app.patch("/api/storage/check_out/{batch_id}")
def storage_check_out(batch_id : str):
    try:
        response = (
            supabase.table("storage_logs")
            .update({"exit_timestamp":datetime.now().isoformat()})
            .eq("batch_id",batch_id)
            .is_("exit_timestamp","null")
            .execute()
        )
        if not response.data or len(response.data)==0:
            return{"message":f"No Active Storage Session for Batch {batch_id}"}

        return{"message":"Storage Check_out Successful"}

    except Exception as e:
        raise HTTPException(status_code=400, detail= str(e))

@app.get("/api/traceability/{batch_id}", summary= "get full lifecycle of batch")
def get_trace(batch_id:str):
    try:
        response =(
            supabase.table("batches")
            .select("*,quality_checks(*),storage_logs(*),supply_chain_events(*)")
            .eq("batch_id",batch_id)
            .single()
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Batch history not found")
        return{
            "status":"Success",
            "Full history": response.data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail= str(e))

@app.get("/api/marketplace")
def get_marketplace(crop_type: Optional[str] = None, min_carbon: Optional[float] = None):
    try:
        query = supabase.table("buyer_marketplace").select("*")
        
        if crop_type:
            query = query.eq("crop_type", crop_type)
        if min_carbon is not None:
            query = query.lte("total_carbon_footprint", min_carbon)
            
        response = query.execute()

        return{
            "results": response.data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/batches/farmer/{farmer_id}")
def get_farmer_batches(farmer_id:str):
    try:
        response= (supabase.table("batches").select("*").eq("farmer_id", farmer_id)
        .execute())
        return{"batches": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/events/operator/{operator_id}")
def get_operator_events(operator_id:str):
    try:
        response = (supabase.table("supply_chain_events")
        .select("*").eq("operator_id", operator_id)
        .execute())
        return{"events":response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/quality/inspector/{inspector_id}")
def get_quality_checks(inspector_id:str):
    try:
        response = (supabase.table("quality_checks")
        .select("*").eq("inspector_id", inspector_id)
        .execute())
        return{"quality_checks": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/storage/history")
def get_storage_history():
    try:
        response = (supabase.table("storage_logs")
        .select("*")
        .order("entry_timestamp",desc =True)
        .execute())
        return{ "storage_history": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/")
def test():
    return {"status": "API running"}
