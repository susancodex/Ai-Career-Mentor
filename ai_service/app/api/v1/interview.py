from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import verify_internal_signature
from app.agents.interview_agent import run_question_generator, run_answer_scorer
from app.schemas.interview import (
    InterviewQuestionsRequest, InterviewQuestionsResult,
    AnswerScoreRequest, AnswerScoreResult,
)

router = APIRouter(prefix="/interview", tags=["interview"])


@router.post(
    "/questions/generate",
    response_model=InterviewQuestionsResult,
    dependencies=[Depends(verify_internal_signature)],
)
async def generate_questions(request: Request, body: InterviewQuestionsRequest):
    try:
        result = await run_question_generator(
            target_role=body.target_role,
            session_id=body.session_id,
            agent_session_id=body.session_id,
            resume_id=body.resume_id,
            years_experience=body.years_experience,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/answer/score",
    response_model=AnswerScoreResult,
    dependencies=[Depends(verify_internal_signature)],
)
async def score_answer(request: Request, body: AnswerScoreRequest):
    try:
        result = await run_answer_scorer(
            question_text=body.question_text,
            user_answer=body.user_answer,
            target_role=body.target_role,
            session_id=body.question_id,
            resume_context=body.resume_context,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
