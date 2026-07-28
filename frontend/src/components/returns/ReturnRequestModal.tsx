import { useState } from 'react';
import { useCreateReturnMutation } from '../../store/slices/returnApiSlice';
import { X, AlertCircle, CheckCircle2, CheckSquare, Square } from 'lucide-react';
import { useGetProductDetailsQuery } from '../../store/slices/productApiSlice';

interface ReturnRequestModalProps {
  orderId: string;
  items: { productId: string; quantity: number }[];
  onClose: () => void;
  onSuccess: () => void;
}

interface ProductDetails {
  id: string;
  name: string;
  image: string;
  size: string;
  color: string;
}

const ProductOption = ({
  productId,
  selected,
  onToggle,
}: {
  productId: string;
  selected: boolean;
  onToggle: (details: ProductDetails) => void;
}) => {
  const { data: product } = useGetProductDetailsQuery(productId);
  const name = product?.name || product?.title || 'Unknown Product';
  const image = product?.images?.[0] || '';
  const size = product?.sizes?.[0] || 'M';
  const color = product?.colors?.[0] || 'Black';

  return (
    <div
      onClick={() => onToggle({ id: productId, name, image, size, color })}
      className={`p-3.5 border rounded-xl flex items-center gap-4 cursor-pointer transition-all ${
        selected ? 'border-[#0050cb] bg-blue-50/60 shadow-sm' : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-200" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${selected ? 'text-[#0050cb]' : 'text-gray-900'}`}>{name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Size: {size} | Color: {color}
        </p>
      </div>
      <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${selected ? 'border-[#0050cb] bg-[#0050cb] text-white' : 'border-gray-300 bg-white'}`}>
        {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-gray-300" />}
      </div>
    </div>
  );
};

export default function ReturnRequestModal({ orderId, items, onClose, onSuccess }: ReturnRequestModalProps) {
  const [createReturn, { isLoading }] = useCreateReturnMutation();
  const [selectedProducts, setSelectedProducts] = useState<ProductDetails[]>([]);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const REASONS = [
    'Product damaged / defective',
    'Received wrong item',
    'Size doesn\'t fit',
    'Item not as described',
    'Quality issue',
    'Other',
  ];

  const handleToggleProduct = (details: ProductDetails) => {
    setSelectedProducts((prev) => {
      const exists = prev.some((p) => p.id === details.id);
      if (exists) {
        return prev.filter((p) => p.id !== details.id);
      } else {
        return [...prev, details];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedProducts.length === 0) {
      setError('Please select at least one item to return');
      return;
    }
    if (!reason) {
      setError('Please select a reason for return');
      return;
    }

    try {
      await Promise.all(
        selectedProducts.map((product) =>
          createReturn({
            orderId,
            productId: product.id,
            productName: product.name,
            productImage: product.image,
            productSize: product.size,
            productColor: product.color,
            reason,
            description,
          }).unwrap()
        )
      );

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Failed to submit return request');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Request a Return</h2>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-medium">Order #{orderId.slice(-6).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Requests Submitted!</h3>
            <p className="text-gray-500 text-sm">Return requests for {selectedProducts.length} item(s) have been submitted to our team for review.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            <div className="p-6 overflow-y-auto space-y-6">
              
              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-gray-900">
                    Select Items to Return ({selectedProducts.length}/{items.length})
                  </label>
                </div>
                <div className="space-y-2">
                  {items.map((item) => {
                    const isSelected = selectedProducts.some((p) => p.id === item.productId);
                    return (
                      <ProductOption
                        key={item.productId}
                        productId={item.productId}
                        selected={isSelected}
                        onToggle={handleToggleProduct}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-900">Reason for Return</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0050cb]/20 focus:border-[#0050cb] bg-white text-gray-900 text-sm"
                  required
                >
                  <option value="" disabled>Select a reason...</option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-900">Additional Comments</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide more details about the issue..."
                  className="w-full p-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0050cb]/20 focus:border-[#0050cb] resize-none text-sm"
                  rows={4}
                />
              </div>

            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
              <button
                type="submit"
                disabled={isLoading || selectedProducts.length === 0}
                className="w-full bg-[#0050cb] text-white font-bold py-3.5 rounded-xl hover:bg-[#003d99] transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center h-[52px] cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  `Submit Return for ${selectedProducts.length} Item${selectedProducts.length === 1 ? '' : 's'}`
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
