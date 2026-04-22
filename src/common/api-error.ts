import { HTTP_STATUS } from "../constants/http-status.js"

class ApiError extends Error {
    statusCode: number
    isOperational: boolean
    error: string

    constructor(statusCode: number, message: string, error: string){
        super(message)
        this.statusCode = statusCode
        this.isOperational = true
        this.error = error
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(error: string="Bad Request", message: string = "Bad Request"){
        return new ApiError(HTTP_STATUS.BAD_REQUEST, message, error)
    }

    static conflict(error: string="Conflict", message: string = "Conflict"){
        return new ApiError(HTTP_STATUS.CONFLICT, message, error)
    }

    static unauthorized(error: string="Unauthorized", message: string = "Unauthorized"){
        return new ApiError(HTTP_STATUS.UNAUTHORIZED, message, error)
    }

    static notFound(error: string="Not Found", message: string = "Not Found"){
        return new ApiError(HTTP_STATUS.NOT_FOUND, message, error)
    }

    static forbidden(error: string="Forbidden", message: string = "Forbidden"){
        return new ApiError(HTTP_STATUS.FORBIDDEN, message, error)
    }

    static internalServerError(error: string="Internal Server Error", message: string = "Internal Server Error"){
        return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, message, error)
    }
}

export default ApiError