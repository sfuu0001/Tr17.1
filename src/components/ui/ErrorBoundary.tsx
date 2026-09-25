import React, { ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-6 text-center bg-white rounded-2xl border border-rose-200 shadow-sm my-6">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
            <AlertOctagon className="w-7 h-7" />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-[#1a1c1b] mb-1">
            页面渲染异常 (Render Error)
          </h3>
          <p className="text-xs sm:text-sm text-[#787770] max-w-md mb-4 leading-relaxed">
            检测到界面组件在加载或数据渲染时发生轻微偏差。您可尝试重置当前视图或重新载入数据。
          </p>

          {this.state.error && (
            <div className="w-full max-w-md bg-[#fafaf8] border border-[#e2e3e1] rounded-xl p-3 text-left text-[11px] font-mono text-rose-900 mb-4 overflow-x-auto">
              {this.state.error.toString()}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>重置状态</span>
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 bg-[#1a1c1b] hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重新加载</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
