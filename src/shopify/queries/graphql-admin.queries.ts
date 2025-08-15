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
        status
        handle
        title
        description
        productType
        status
        tags
        onlineStoreUrl
        onlineStorePreviewUrl
        hasOnlyDefaultVariant
        vendor
        category {
          name
          fullName
          id
        }
        featuredMedia {
          id
          alt
          mediaContentType
          preview {
            image {
              altText
              url
              height
              width
            }
          }
        }
        seo {
          title,
          description,
        }
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
    status
    handle
    title
    description
    productType
    status
    tags
    onlineStoreUrl
    onlineStorePreviewUrl
    hasOnlyDefaultVariant
    vendor
    category {
      name
      fullName
      id
    }
    featuredMedia {
      id
      alt
      mediaContentType
      preview {
        image {
          altText
          url
          height
          width
        }
      }
    }
    seo {
      title,
      description,
    }
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
      description
      myshopifyDomain
      id
      primaryDomain {
        host
      }
    }
  }
`;
