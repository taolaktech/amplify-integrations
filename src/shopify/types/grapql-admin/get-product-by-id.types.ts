export interface GetProductByIdResponseBody {
  data: {
    shop: Shop;
    productByIdentifier: ProductByIdentifier | null;
  };
  extensions: Extensions;
  headers: { [key: string]: string[] };
}

type ProductByIdentifier = {
  id: string;
  title: string;
  description: string;
  priceRangeV2: PriceRangeV2;
  media: Media;
  variants: Variants;
};

type Media = {
  edges: MediaEdge[];
};

type MediaEdge = {
  node: PurpleNode;
};

type PurpleNode = {
  id: string;
  mediaContentType: string;
  preview: Preview;
};

type Preview = {
  image: Image;
};

type Image = {
  url: string;
  altText: string;
  height: number;
  weight: number;
};

type PriceRangeV2 = {
  maxVariantPrice: VariantPrice;
  minVariantPrice: VariantPrice;
};

type VariantPrice = {
  amount: string;
  currencyCode: string;
};

type Variants = {
  edges: VariantsEdge[];
  pageInfo: PageInfo;
};

type VariantsEdge = {
  node: FluffyNode;
};

type FluffyNode = {
  id: string;
  displayName: string;
  title: string;
  price: string;
  image: null;
};

type PageInfo = {
  hasNextPage: boolean;
};

type Shop = {
  currencyCode: string;
};

type Extensions = {
  cost: Cost;
};

type Cost = {
  requestedQueryCost: number;
  actualQueryCost: number;
  throttleStatus: ThrottleStatus;
};

type ThrottleStatus = {
  maximumAvailable: number;
  currentlyAvailable: number;
  restoreRate: number;
};
