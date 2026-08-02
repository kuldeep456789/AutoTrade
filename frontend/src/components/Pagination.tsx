import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) => {
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
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const pageButton = (active: boolean) =>
    `w-14 h-14 sm:w-16 sm:h-16
     rounded-2xl
     flex items-center justify-center
     text-base sm:text-lg
     font-semibold
     transition-all duration-300
     cursor-pointer
     border
     active:scale-95
     ${active
      ? 'bg-[#FF7A00] border-[#FF7A00] text-white shadow-xl shadow-orange-500/30 scale-105'
      : 'bg-white dark:bg-[#18181B] border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-[#FF7A00] hover:text-[#FF7A00] hover:-translate-y-1 hover:shadow-lg'
    }`;

  const arrowButton =
    'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181B] text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition-all duration-300 cursor-pointer hover:border-[#FF7A00] hover:text-[#FF7A00] hover:-translate-y-1 hover:shadow-lg active:scale-95 disabled:opacity-40 disabled:pointer-events-none';

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center py-14 sm:py-16 mt-16 border-t border-zinc-200 dark:border-zinc-800"
    >
      <div className="flex items-center gap-4">

        {/* Previous */}
        <button
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          className={arrowButton}
          aria-label="Previous Page"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>

        {/* First Page */}
        {pageNumbers[0] > 1 && (
          <>
            <button
              onClick={() => handlePageClick(1)}
              className={pageButton(currentPage === 1)}
            >
              1
            </button>

            {pageNumbers[0] > 2 && (
              <span className="w-10 sm:w-12 text-2xl font-bold text-zinc-400 text-center">
                …
              </span>
            )}
          </>
        )}

        {/* Visible Pages */}
        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => handlePageClick(page)}
            className={pageButton(currentPage === page)}
          >
            {page}
          </button>
        ))}

        {/* Last Page */}
        {pageNumbers[pageNumbers.length - 1] < totalPages && (
          <>
            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <span className="w-10 sm:w-12 text-2xl font-bold text-zinc-400 text-center">
                …
              </span>
            )}

            <button
              onClick={() => handlePageClick(totalPages)}
              className={pageButton(currentPage === totalPages)}
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next */}
        <button
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={arrowButton}
          aria-label="Next Page">

          <ChevronRight size={24} strokeWidth={2.5} />
        </button>

      </div>
    </nav>
  );
};


export default Pagination;
