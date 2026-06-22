import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/app";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0b1220] text-white p-6 sm:p-12 font-sans select-none">
          <div className="max-w-md w-full text-center space-y-8 bg-[#151f32]/80 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-300">
            {/* Icon decoration */}
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-950/40 border border-red-500/20 text-red-500 mb-2">
              <AlertTriangle className="w-10 h-10 animate-bounce" />
              <div className="absolute inset-0 rounded-full bg-red-500/10 blur-xl animate-pulse"></div>
            </div>

            {/* Error Message */}
            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Đã xảy ra sự cố!
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ứng dụng gặp lỗi không mong muốn trong quá trình xử lý. Đừng lo lắng, dữ liệu phỏng vấn của bạn vẫn được lưu trữ an toàn.
              </p>
            </div>

            {/* Collapsible details for devs */}
            {this.state.error && (
              <div className="text-left bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 overflow-auto max-h-32 text-xs font-mono text-red-400/90 leading-relaxed shadow-inner">
                <span className="font-semibold text-slate-500 select-all">Error:</span> {this.state.error.message}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={this.handleReload}
                variant="accent"
                className="flex-1 h-12 text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Tải lại trang
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1 h-12 text-sm font-semibold border-slate-700 hover:bg-slate-800/50 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Về bảng điều khiển
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
