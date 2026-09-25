import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/* ============================================================================
 * MerchantMenuPagination — 矩阵页脚遥测条与分页器
 * ----------------------------------------------------------------------------
 * 结构（与参考稿表尾一致）：
 *   左：ROW n-m OF N ITEMS RECORDED | LATENCY | PAGING SIZE（可切换）
 *   右：PREV / 页码 / NEXT 战术分页器
 * 三端：mobile 纵向堆叠并隐藏次要遥测，平板/桌面单行等宽排布。
 * ========================================================================== */

interface MerchantMenuPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** 边缘节点读数（缺省为参考稿基准值） */
  latencyMs?: number;
}

export const MerchantMenuPagination: React.FC<MerchantMenuPaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  latencyMs = 14
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const safeTotalPages = Math.max(1, totalPages);

  // 页码窗口：总数 ≤7 全量展开，否则 1 … 当前±1 … 末页
  const pageNumbers: Array<number | 'ellipsis'> = [];
  if (safeTotalPages <= 7) {
    for (let i = 1; i <= safeTotalPages; i += 1) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push('ellipsis');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(safeTotalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i += 1) pageNumbers.push(i);
    if (currentPage < safeTotalPages - 2) pageNumbers.push('ellipsis');
    pageNumbers.push(safeTotalPages);
  }

  const navButton =
    'px-2 py-1 rounded-console bg-card-bg border border-border-main text-text-prominent hover:bg-page-bg uppercase transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="px-space-md py-space-sm bg-page-bg border-t border-border-main flex flex-wrap items-center justify-between gap-space-sm">
      <div className="flex items-center gap-space-md flex-wrap">
        <span className="font-label-micro text-text-muted uppercase">
          ROW {startItem}-{endItem} OF {totalItems} ITEMS RECORDED
        </span>
        <div className="h-3 w-px bg-border-main hidden sm:block" />
        <span className="font-label-micro text-text-body uppercase hidden sm:inline">
          LATENCY: <span className="text-status-olive font-bold">{latencyMs}MS</span> (SZ04-EDGE)
        </span>
        <div className="h-3 w-px bg-border-main hidden sm:block" />
        <label className="font-label-micro text-text-muted uppercase flex items-center gap-1.5">
          PAGING SIZE:
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label="每页记录数"
            className="bg-card-bg border border-border-main rounded-console px-1.5 py-0.5 font-label-micro font-bold text-text-prominent cursor-pointer focus:outline-none focus:border-dark-container"
          >
            <option value={10}>10 / PAGE</option>
            <option value={20}>20 / PAGE</option>
            <option value={50}>50 / PAGE</option>
            <option value={100}>100 / PAGE</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1 font-label-micro">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className={`${navButton} flex items-center gap-0.5`}
        >
          <ChevronLeft className="w-3 h-3" strokeWidth={2.2} />
          <span className="hidden sm:inline">PREV</span>
        </button>

        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <span key={`ellipsis-${index}`} className="px-1 text-text-muted">
                ...
              </span>
            );
          }
          const isActive = page === currentPage;
          return (
            <button
              key={`page-${page}`}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onPageChange(page)}
              className={`px-2.5 py-1 rounded-console font-bold transition-colors cursor-pointer ${
                isActive
                  ? 'bg-dark-container text-white'
                  : 'bg-card-bg border border-border-main text-text-prominent hover:bg-page-bg'
              }`}
            >
              {page}
            </button>
          );
        })}

        <button
          type="button"
          disabled={currentPage >= safeTotalPages}
          onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
          className={`${navButton} flex items-center gap-0.5`}
        >
          <span className="hidden sm:inline">NEXT</span>
          <ChevronRight className="w-3 h-3" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
};

export default MerchantMenuPagination;
