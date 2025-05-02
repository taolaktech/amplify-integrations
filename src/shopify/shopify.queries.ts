export const getProductsQuery = (
  paramsDefinition: string,
  qParams: string,
) => `#graphql
query GetProducts(${paramsDefinition}) {
  shop {
    name
    url
    currencyCode
  }
  productsCount {
    count
  }
  products (${qParams}) {
    edges {
      node {
        id
        handle
        title
        description
        hasOnlyDefaultVariant
        priceRangeV2 {
          maxVariantPrice {
            amount
            currencyCode
          }
          minVariantPrice {
            amount
            currencyCode
          }
        }
        media(first: 2) {
          edges {
            node {
              id
              mediaContentType
              preview {
                image {
                  url
                  height
                  width
                }
              }
            }
          }
        }
      }
    }
    pageInfo {
      hasPreviousPage
      hasNextPage
      startCursor
      endCursor
    }
  }
}`;

export const getProductsByIdQuery = () => `#graphql
query getProductById($identifier: ProductIdentifierInput!) {
  shop {
    name
    url
    currencyCode
  }
  productByIdentifier (identifier: $identifier) {
    id
    handle
    title
    description
    hasOnlyDefaultVariant
    priceRangeV2 {
      maxVariantPrice {
        amount
        currencyCode
      }
      minVariantPrice {
        amount
        currencyCode
      }
    }
    media(first: 2) {
      edges {
        node {
          id
          mediaContentType
          preview {
            image {
              url
              height
              width
            }
          }
        }
      }
    }
    variants(first: 2) {
      edges {
        node {
          id,
          displayName,
          title,
          price,
        }
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
}`;

export const getShopQuery = () => `#graphql
  query GetShop {
    shop {
      name
      url
      currencyCode
    }
  }
`;
