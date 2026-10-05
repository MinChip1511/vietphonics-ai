"""Children of the signed-in parent: profiles, practice history, rewards. Every route is owner-scoped."""
import csv
import io
from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel

from .. import kids
from ..security import current_account

router = APIRouter(prefix="/api", tags=["profiles"])


class CreateChildBody(BaseModel):
    name: str
    age: int
    avatar: str = "mascot:ca-voi"
    initial_needs: list[str] = []
    settings: Optional[dict] = None


class UpdateChildBody(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    avatar: Optional[str] = None
    settings: Optional[dict] = None


class RecordBody(BaseModel):
    child_id: str
    attempt_id: str


class RedeemBody(BaseModel):
    reward_id: str


@router.get("/profiles")
def list_profiles(account: dict = Depends(current_account)):
    return kids.list_children(account["id"])


@router.post("/profiles", status_code=201)
def create_profile(body: CreateChildBody, account: dict = Depends(current_account)):
    return kids.create_child(account, name=body.name, age=body.age, avatar=body.avatar,
                             initial_needs=body.initial_needs, settings=body.settings)


@router.get("/profiles/{child_id}")
def get_profile(child_id: str, account: dict = Depends(current_account)):
    return kids.get_profile(child_id, account)


@router.patch("/profiles/{child_id}")
def update_profile(child_id: str, body: UpdateChildBody, account: dict = Depends(current_account)):
    return kids.update_child(child_id, account, body.model_dump(exclude_none=True))


@router.delete("/profiles/{child_id}")
def delete_profile(child_id: str, account: dict = Depends(current_account)):
    kids.get_owned_child(child_id, account)
    kids.delete_child(child_id)
    return {"status": "deleted"}


@router.post("/record-practice")
def record_practice(body: RecordBody, account: dict = Depends(current_account)):
    child, awarded = kids.record_practice(account, body.child_id, body.attempt_id)
    return {"status": "success", "updated_child": child, "stars_awarded": awarded}


@router.get("/practice-history")
def practice_history(child_id: str, limit: int = 15, account: dict = Depends(current_account)):
    return {"child_id": child_id, "history": kids.practice_history(child_id, account, limit)}


@router.get("/profiles/{child_id}/export.csv")
def export_history(child_id: str, account: dict = Depends(current_account)):
    rows = kids.practice_history(child_id, account, 500)
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["word", "score", "passed", "created_at"])
    for r in rows:
        # A leading =,+,-,@ would run as a formula in Excel; words are admin content but stay safe.
        word = r["word"] if r["word"][:1] not in "=+-@" else "'" + r["word"]
        writer.writerow([word, r["score"], r["is_correct"], r["created_at"]])
    return Response(out.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="vietphonics-{child_id}.csv"'})


@router.get("/profiles/{child_id}/rewards")
def child_rewards(child_id: str, account: dict = Depends(current_account)):
    return kids.child_rewards(child_id, account)


@router.post("/profiles/{child_id}/redeem")
def redeem(child_id: str, body: RedeemBody, account: dict = Depends(current_account)):
    data = kids.redeem_reward(child_id, account, body.reward_id)
    return {**data, "profile": kids.get_profile(child_id, account)}
