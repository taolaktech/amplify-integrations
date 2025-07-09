export const getShopQuery = () => `#graphql
  query GetShop {
    shop {
      name
      description
      customerAccountUrl
      brand {
        shortDescription
        slogan
        coverImage {
          image {
            url
          }
        }
        logo {
          image {
            url
          }
        }
        colors {
          primary {
            foreground
            background
          }
          secondary {
            foreground
            background
          }
        }
      }
    }
  }
`;
