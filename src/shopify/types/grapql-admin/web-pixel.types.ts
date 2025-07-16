export type WebPixelCreate = {
  webPixelCreate: {
    userErrors: any[];
    webPixel: {
      id: string;
      settings: string;
    };
  };
};
export interface CreateWebPixelResponse {
  data: WebPixelCreate;
  extensions: Extensions;
  headers: { [key: string]: string[] };
}

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
