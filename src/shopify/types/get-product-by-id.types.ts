export interface GetProductByIdResponseBody {
  data: Data;
  extensions: Extensions;
  headers: { [key: string]: string[] };
}

interface Data {
  shop: Shop;
  productByIdentifier: ProductByIdentifier | null;
}

interface ProductByIdentifier {
  id: string;
  title: string;
  description: string;
  priceRangeV2: PriceRangeV2;
  media: Media;
  variants: Variants;
}

interface Media {
  edges: MediaEdge[];
}

interface MediaEdge {
  node: PurpleNode;
}

interface PurpleNode {
  id: string;
  mediaContentType: string;
  preview: Preview;
}

interface Preview {
  image: Image;
}

interface Image {
  url: string;
  altText: string;
}

interface PriceRangeV2 {
  maxVariantPrice: VariantPrice;
  minVariantPrice: VariantPrice;
}

interface VariantPrice {
  amount: string;
  currencyCode: string;
}

interface Variants {
  edges: VariantsEdge[];
  pageInfo: PageInfo;
}

interface VariantsEdge {
  node: FluffyNode;
}

interface FluffyNode {
  id: string;
  displayName: string;
  title: string;
  price: string;
  image: null;
}

interface PageInfo {
  hasNextPage: boolean;
}

interface Shop {
  currencyCode: string;
}

interface Extensions {
  cost: Cost;
}

interface Cost {
  requestedQueryCost: number;
  actualQueryCost: number;
  throttleStatus: ThrottleStatus;
}

interface ThrottleStatus {
  maximumAvailable: number;
  currentlyAvailable: number;
  restoreRate: number;
}
