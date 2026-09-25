from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime
import traceback


def app_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": str(exc),
            "detail": "Internal server error",
            "timestamp": datetime.utcnow().isoformat()
        }
    )


class APIError(Exception):
    def __init__(self, message: str, status_code: int = 400, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class ValidationError(APIError):
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, 422, details)


class NotFoundError(APIError):
    def __init__(self, message: str):
        super().__init__(message, 404)


class PermissionError(APIError):
    def __init__(self, message: str):
        super().__init__(message, 403)


class ProcessingError(APIError):
    def __init__(self, message: str):
        super().__init__(message, 500)


class DuplicateError(APIError):
    def __init__(self, message: str):
        super().__init__(message, 409)
