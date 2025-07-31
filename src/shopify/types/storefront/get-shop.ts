export interface ShopResponseData {
  shop: Shop;
}

interface Shop {
  name: string;
  description: null;
  customerAccountUrl: string;
  brand: Brand;
}

export interface Brand {
  shortDescription: string | null;
  slogan: string | null;
  coverImage: Image | null;
  logo: Image | null;
  colors: Colors;
}

export interface Colors {
  primary: any[];
  secondary: any[];
}

export interface Extensions {
  cost: Cost;
}

export interface Cost {
  requestedQueryCost: number;
}

type Image = {
  url: string;
  altText: string;
  height: number;
  width: number;
};
