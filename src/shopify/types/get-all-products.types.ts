export interface GetAllProductsResponseBody {
  data: {
    shop: Shop;
    products: Products;
  };
  extensions: Extensions;
  headers: { [key: string]: string[] };
}

type Products = {
  edges: ProductsEdge[];
  pageInfo: PageInfo;
};

type ProductsEdge = {
  node: PurpleNode;
};

type PurpleNode = {
  id: string;
  title: string;
  description: string;
  priceRangeV2: PriceRangeV2;
  media: Media;
};

type Media = {
  edges: MediaEdge[];
};

type MediaEdge = {
  node: FluffyNode;
};

type FluffyNode = {
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
};

type PriceRangeV2 = {
  maxVariantPrice: VariantPrice;
  minVariantPrice: VariantPrice;
};

type VariantPrice = {
  amount: string;
  currencyCode: string;
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
