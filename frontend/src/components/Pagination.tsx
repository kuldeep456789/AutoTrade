import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handlePageClick = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center py-10 sm:py-14 border-t border-zinc-100 dark:border-zinc-800/80 mt-12">
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Previous Button */}
        <button
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous Page"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-95 shadow-xs"
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>

        {/* First Page */}
        {pageNumbers[0] > 1 && (
          <>
            <button
              onClick={() => handlePageClick(1)}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer active:scale-95 ${currentPage === 1
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                  : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
            >
              1
            </button>
            {pageNumbers[0] > 2 && (
              <span className="w-8 h-10 sm:w-9 sm:h-11 flex items-center justify-center text-zinc-400 dark:text-zinc-500 font-semibold text-sm select-none">
                •••
              </span>
            )}
          </>
        )}

        {/* Visible Page Numbers */}
        {pageNumbers.map((pageNum) => {
          const isActive = currentPage === pageNum;
          return (
            <button
              key={pageNum}
              onClick={() => handlePageClick(pageNum)}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer active:scale-95 ${isActive
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm scale-105'
                  : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Last Page */}
        {pageNumbers[pageNumbers.length - 1] < totalPages && (
          <>
            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <span className="w-8 h-10 sm:w-9 sm:h-11 flex items-center justify-center text-zinc-400 dark:text-zinc-500 font-semibold text-sm select-none">
                •••
              </span>
            )}
            <button
              onClick={() => handlePageClick(totalPages)}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer active:scale-95 ${currentPage === totalPages
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                  : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next Button */}
        <button
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next Page"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-95 shadow-xs"
        >
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      </div>
    </nav>
  );
};

export default Pagination;
