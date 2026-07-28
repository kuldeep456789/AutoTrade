export type ProductLike = {
  _id?: string;
  id?: string;
  pid?: string;

  name?: string;
  title?: string;

  image?: string;
  img?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  mainImage?: string;
  imageUrl?: string;

  // CJ Dropshipping
  productImage?: string;
  productImages?: string[];

  images?: Array<string | { url?: string; image?: string; src?: string } | null>;
  imageList?: Array<string | { url?: string; image?: string; src?: string } | null>;
  imgList?: Array<string | { url?: string; image?: string; src?: string } | null>;

  variants?: Array<{
    image?: string;
    productImage?: string;
    variantImage?: string;
    imageUrl?: string;
    src?: string;
    color?: string;
    size?: string;
    stock?: number;
  }>;
};

const IMAGE_KEYS = ['images', 'imageList', 'imgList'] as const;
const isUsableImage = (value: string) => Boolean(value) && !value.startsWith('data:image');

const pickImageFromArray = (
  value?: Array<string | { url?: string; image?: string; src?: string } | null>,
): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item) return null;

      if (typeof item === 'string') {
        return item;
      }

      return item.url || item.image || item.src || null;
    })
    .filter((item): item is string => Boolean(item));
};

export const getProductImages = (product: ProductLike): string[] => {
  if (!product) return [];

  // Images inside variants
  const variantImages =
    product.variants
      ?.map(
        (variant) =>
          variant.image ||
          variant.productImage ||
          variant.variantImage ||
          variant.imageUrl ||
          variant.src,
      )
      .filter((img): img is string => Boolean(img)) ?? [];

  const images = [
    // CJ fields
    product.productImage,
    ...(product.productImages ?? []),

    // Generic fields
    product.image,
    product.img,
    product.thumbnail,
    product.thumbnailUrl,
    product.mainImage,
    product.imageUrl,

    // Arrays
    ...IMAGE_KEYS.flatMap((key) =>
      pickImageFromArray(product[key as keyof ProductLike] as any),
    ),

    // Variant images
    ...variantImages,
  ].filter((item): item is string => Boolean(item));

  return [...new Set(images)].filter(isUsableImage);
};

export const getProductId = (product: ProductLike): string =>
  product.pid || product._id || product.id || '';

export const getFirstProductImage = (
  product: ProductLike,
): string | null => {
  const images = getProductImages(product);
  return images.length ? images[0] : null;
};
