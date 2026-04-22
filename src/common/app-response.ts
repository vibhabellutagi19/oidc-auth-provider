import { HTTP_STATUS } from "../constants/http-status";
import type { Response } from "express";

class ApiResponse {
  static ok<T>(res: Response, data: T, message: string) {
    return res.status(HTTP_STATUS.OK as number).json({
      success: true,
      data,
      message,
    });
  }

  static created<T>(res: Response, data: T, message: string) {
    return res.status(HTTP_STATUS.CREATED as number).json({
      success: true,
      data,
      message,
    });
  }
}

export default ApiResponse;
