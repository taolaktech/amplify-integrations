export interface GetShopResponseBody {
  data: {
    shop: Shop;
  };
  extensions: Extensions;
  headers: { [key: string]: string[] };
}

type Shop = {
  name: string;
  url: string;
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
