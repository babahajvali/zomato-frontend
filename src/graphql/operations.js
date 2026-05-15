import { gql } from '@apollo/client'

// ---------- Restaurants ----------
export const BROWSE_RESTAURANTS = gql`
  query BrowseRestaurants($params: BrowseRestaurantsInputParams!) {
    browseRestaurants(params: $params) {
      __typename
      ... on BrowseRestaurantsType {
        restaurants {
          restaurantId
          name
          description
          cuisineType
          address
          pinCode
          isVegOnly
          isDeleted
          averageRating
          totalReviews
          isOpen
        }
      }
      ... on InvalidCuisineTypeException { cuisineType }
      ... on InvalidMinRating { minRating }
    }
  }
`

export const GET_USER_RECOMMENDED_RESTAURANTS = gql`
  query GetUserRecommendedRestaurants($params: GetScoredRestaurantsInputParams!) {
    getUserRecommendedRestaurants(params: $params) {
      __typename
      ... on ScoredRestaurantsType {
        restaurants {
          restaurantId
          name
          cuisineType
          address
          pincode
          isVegOnly
          isDeleted
          averageRating
          totalReviews
          score
          isOpen
          dayFrequent
          orderVolume
        }
      }
      ... on InvalidLimit { limit }
      ... on InvalidOffset { offset }
    }
  }
`

export const GET_SCORED_RESTAURANT_ITEMS = gql`
  query GetScoredRestaurantItems($params: GetScoredRestaurantItemsInputParams!) {
    getScoredRestaurantItems(params: $params) {
      __typename
      ... on ScoredItemsType {
        menuItems {
          menuItemId
          restaurantId
          name
          price
          isAvailable
          totalOrdersCount
          recentlyOrderCount
          score
          averageRating
        }
      }
      ... on RestaurantNotFound { restaurantId }
    }
  }
`

export const VIEW_RESTAURANT_MENU = gql`
  query ViewRestaurantMenu($params: ViewRestaurantMenuInputParams!) {
    viewRestaurantManu(params: $params) {
      __typename
      ... on RestaurantMenuType {
        restaurantId
        categories {
          category
          items {
            itemId
            name
            description
            price
            category
            isVeg
            isAvailable
            preparationTimeInMinutes
            tags
          }
        }
      }
      ... on RestaurantNotFound { restaurantId }
    }
  }
`

export const GET_RESTAURANT_TIMINGS = gql`
  query GetRestaurantTimings($params: GetRestaurantTimingsInputParams!) {
    getRestaurantTimings(params: $params) {
      __typename
      ... on RestaurantTimingsListType {
        restaurantId
        timings {
          id
          dayOfWeek
          openTime
          closeTime
        }
      }
      ... on RestaurantNotFound { restaurantId }
    }
  }
`

export const GET_OWNER_RESTAURANTS = gql`
  query GetOwnerRestaurants {
    getOwnerRestaurants {
      __typename
      ... on OwnerRestaurantsType {
        restaurants {
          restaurantId
          name
          description
          cuisineType
          address
          pinCode
          isVegOnly
          isDeleted

        }
      }
    }
  }
`

// ---------- Owner: menu items ----------
export const CREATE_MENU_ITEMS = gql`
  mutation CreateMenuItems($params: CreateMenuItemsInputParams!) {
    createMenuItems(params: $params) {
      __typename
      ... on MenuItemsType {
        menuItems {
          itemId
          restaurantId
          name
          description
          price
          category
          isVeg
          isAvailable
          preparationTimeInMinutes
          tags
        }
      }
      ... on RestaurantNotFound { restaurantId }
      ... on InvalidCategories { categories }
      ... on UserNotRestaurantOwner { userId }
    }
  }
`

export const UPDATE_MENU_ITEM = gql`
  mutation UpdateMenuItem($params: UpdateMenuItemInputParams!) {
    updateMenuItem(params: $params) {
      __typename
      ... on MenuItemType {
        itemId
        restaurantId
        name
        description
        price
        category
        isVeg
        isAvailable
        preparationTimeInMinutes
        tags
      }
      ... on MenuItemNotFound { menuItemId }
      ... on UserNotRestaurantOwner { userId }
    }
  }
`

export const DELETE_MENU_ITEM = gql`
  mutation DeleteMenuItem($params: DeleteMenuItemInputParams!) {
    deleteMenuItem(params: $params) {
      __typename
      ... on DeleteMenuItemSuccessType { success menuItemId }
      ... on MenuItemNotFound { menuItemId }
      ... on UserNotRestaurantOwner { userId }
    }
  }
`

// ---------- Owner: timings ----------
export const CREATE_RESTAURANT_TIMING = gql`
  mutation CreateRestaurantTiming($params: CreateRestaurantTimingInputParams!) {
    createRestaurantTiming(params: $params) {
      __typename
      ... on RestaurantTimingType {
        id
        restaurantId
        dayOfWeek
        openTime
        closeTime
      }
      ... on RestaurantNotFound { restaurantId }
      ... on InvalidTimingRange { openTime closeTime }
      ... on UserNotRestaurantOwner { userId }
    }
  }
`

export const UPDATE_RESTAURANT_TIMING = gql`
  mutation UpdateRestaurantTiming($params: UpdateRestaurantTimingInputParams!) {
    updateRestaurantTiming(params: $params) {
      __typename
      ... on RestaurantTimingType {
        id
        restaurantId
        dayOfWeek
        openTime
        closeTime
      }
      ... on RestaurantTimingNotFound { id }
      ... on InvalidTimingRange { openTime closeTime }
      ... on UserNotRestaurantOwner { userId }
    }
  }
`

export const DELETE_RESTAURANT_TIMING = gql`
  mutation DeleteRestaurantTiming($params: DeleteRestaurantTimingInputParams!) {
    deleteRestaurantTiming(params: $params) {
      __typename
      ... on DeleteRestaurantTimingSuccessType { timingId success }
      ... on RestaurantTimingNotFound { id }
      ... on UserNotRestaurantOwner { userId }
    }
  }
`

// ---------- Cart ----------
export const GET_CART_ITEMS = gql`
  query GetCartItems($params: GetCartItemsInputParams!) {
    getCartItems(params: $params) {
      __typename
      ... on CartItemsType {
        cartItems {
          cartItemId
          cartId
          menuItemId
          quantity
          itemPrice
        }
      }
      ... on CartNotFound { cartId }
    }
  }
`

export const GET_CUSTOMER_CART_ID = gql`
  query GetCustomerCartId {
    getCustomerCartId {
      __typename
      ... on CustomerCartIdType {
        cartId
      }
    }
  }
`

export const UPDATE_CART_ITEM = gql`
  mutation UpdateCartItem($params: UpdateCartItemInputParams!) {
    updateCartItem(params: $params) {
      __typename
      ... on CartItemType {
        cartItemId
        cartId
        menuItemId
        quantity
        itemPrice
      }
      ... on CartNotFound { cartId }
      ... on MenuItemNotFound { menuItemId }
      ... on InvalidQuantity { quantity }
    }
  }
`

export const REMOVE_CART_ITEM = gql`
  mutation RemoveCartItem($params: RemoveCartItemInputParams!) {
    removeCartItem(params: $params) {
      __typename
      ... on RemoveCartItemSuccessType {
        success
        cartItemId
      }
      ... on CartItemNotFound { cartItemId }
    }
  }
`

export const CLEAR_CART_ITEMS = gql`
  mutation ClearCartItems($params: ClearCartItemsInputParams!) {
    clearCartItems(params: $params) {
      __typename
      ... on ClearCartItemsSuccessType { success cartId }
      ... on CartNotFound { cartId }
    }
  }
`

// ---------- Reviews ----------
export const GET_USER_RESTAURANT_REVIEW = gql`
  query GetUserRestaurantReview($params: GetUserRestaurantReviewInputParams!) {
    getUserRestaurantReview(params: $params) {
      __typename
      ... on ReviewType {
        reviewId
        restaurantId
        customerId
        rating
        review
        createdAt
      }
    }
  }
`

export const CREATE_REVIEW = gql`
  mutation CreateReview($params: CreateReviewInputParams!) {
    createReview(params: $params) {
      __typename
      ... on ReviewType {
        reviewId
        restaurantId
        customerId
        rating
        review
      }
      ... on RestaurantNotFound { restaurantId }
      ... on RestaurantAlreadyReviewedByUser { userId }
      ... on InvalidRatingFound { userRating }
    }
  }
`

// ---------- Account ----------
export const CREATE_USER = gql`
  mutation CreateUser($params: CreateUserInputParams!) {
    createUser(params: $params) {
      __typename
      ... on UserType {
        userId
        email
        name
        phoneNumber
        role
      }
      ... on EmailAlreadyExists { emails }
      ... on EmptyUserNameFound { name }
    }
  }
`

export const UPDATE_USER = gql`
  mutation UpdateUser($params: UpdateUserInputParams!) {
    updateUser(params: $params) {
      __typename
      ... on UserType {
        userId
        email
        name
        phoneNumber
        role
      }
      ... on UserNotFound { userId }
      ... on EmptyUserNameFound { name }
      ... on NothingToUpdateUserProperties { userId }
      ... on UnauthorizedFound { contextUserId }
    }
  }
`

export const USER_LOGIN = gql`
  mutation UserLogin($params: UserLoginInputParams!) {
    userLogin(params: $params) {
      __typename
      ... on UserLoginType {
        userId
        email
        name
        phoneNumber
        role
        accessToken
      }
      ... on EmailNotFound { email }
      ... on InvalidCredentials { email }
    }
  }
`

export const GET_USER_ADDRESSES = gql`
  query GetUserAddress {
    getUserAddresses {
      __typename
      ... on UserAddressesType {
        userId
        addresses {
          addressId
          fullAddress
          city
          pincode
          label
          isDefault
        }
      }
      ... on UserNotFound { userId }
    }
  }
`

// ---------- Orders ----------
export const PLACE_ORDER = gql`
  mutation PlaceOrder($params: PlaceOrderInputParams!) {
    placeOrder(params: $params) {
      __typename
      ... on OrderSummaryType {
        orderId
        customerId
        restaurantId
        promoCodeId
        status
        itemsTotal
        deliveryFee
        taxFee
        finalAmount
        addressId
        placedAt
        items { itemId quantity itemPrice subtotal }
      }
      ... on PromoCodeUsageLimitReached { maxUsageCount }
      ... on PromoCodeNotEligible { minOrderValue itemsTotal }
      ... on DeliveryUnavailableForAddress { restaurantId pinCode }
      ... on AddressIdNotFound { addressId }
      ... on RestaurantNotOpen { restaurantId dayOfWeek }
      ... on RestaurantClosed { restaurantId }
      ... on PromoCodeNotFound { promoCodeId }
      ... on CartIsEmpty { cartId }
      ... on CustomerCartNotFound { customerIdInt: customerId }
      ... on MenuItemsUnavailable { unavailableItemIds }
    }
  }
`

export const PLACE_SCHEDULED_ORDER = gql`
  mutation PlaceScheduledOrder($params: PlaceScheduledOrderInputParams!) {
    placeScheduledOrder(params: $params) {
      __typename
      ... on ScheduledOrderSummaryType {
        orderId
        customerId
        restaurantId
        promoCodeId
        status
        itemsTotal
        deliveryFee
        taxFee
        finalAmount
        addressId
        placedAt
        scheduledFor
        items { itemId quantity itemPrice subtotal }
      }
      ... on PromoCodeUsageLimitReached { maxUsageCount }
      ... on PromoCodeNotEligible { minOrderValue itemsTotal }
      ... on DeliveryUnavailableForAddress { restaurantId pinCode }
      ... on AddressIdNotFound { addressId }
      ... on ScheduledTimeTooSoon { scheduledFor }
      ... on RestaurantNotOpenAtScheduledTime { restaurantId scheduledFor }
      ... on PromoCodeNotFound { promoCodeId }
      ... on CartIsEmpty { cartId }
      ... on CustomerCartNotFound { customerIdInt: customerId }
      ... on MenuItemsUnavailable { unavailableItemIds }
    }
  }
`

export const CANCEL_ORDER = gql`
  mutation CancelOrder($params: CancelOrderInputParams!) {
    cancelOrder(params: $params) {
      __typename
      ... on OrderType {
        orderId
        status
      }
      ... on OrderNotFound { orderId }
      ... on OrderNotOwnedByUser { orderId }
      ... on OrderCancellationWindowExpired { orderId minutes }
      ... on OrderCancellationNotAllowed { orderId }
      ... on OrderAlreadyCancelled { orderId }
    }
  }
`

export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($params: UpdateOrderStatusInputParams!) {
    updateOrderStatus(params: $params) {
      __typename
      ... on OrderType {
        orderId
        status
      }
      ... on OrderNotFound { orderId }
      ... on UserNotRestaurantOwner { userId }
      ... on InvalidOrderStatusTransition { currentStatus newStatus allowed }
    }
  }
`

export const GET_ORDER = gql`
  query GetOrder($params: GetOrderInputParams!) {
    getOrder(params: $params) {
      __typename
      ... on OrderSummaryType {
        orderId
        customerId
        restaurantId
        promoCodeId
        status
        itemsTotal
        deliveryFee
        taxFee
        finalAmount
        addressId
        placedAt
        items { itemId quantity itemPrice subtotal }
      }
      ... on OrderNotFound { orderId }
    }
  }
`

export const USER_ORDERS = gql`
  query UserOrders($params: GetUserOrdersInputParams!) {
    userOrders(params: $params) {
      __typename
      ... on OrdersType {
        orders {
          orderId
          customerId
          restaurantId
          promoCodeId
          status
          itemsTotal
          deliveryFee
          taxFee
          finalAmount
          addressId
          placedAt
        }
      }
    }
  }
`

export const USER_SCHEDULED_ORDERS = gql`
  query UserScheduledOrders($params: GetUserScheduledOrdersInputParams!) {
    userScheduledOrders(params: $params) {
      __typename
      ... on ScheduledOrderSummariesType {
        orderSummaries {
          orderId
          customerId
          restaurantId
          promoCodeId
          status
          itemsTotal
          deliveryFee
          taxFee
          finalAmount
          addressId
          placedAt
          scheduledFor
          items { itemId quantity itemPrice subtotal }
        }
      }
    }
  }
`

export const RESTAURANT_ORDERS = gql`
  query RestaurantOrders($params: GetRestaurantOrdersInputParams!) {
    restaurantOrders(params: $params) {
      __typename
      ... on OrdersType {
        orders {
          orderId
          customerId
          restaurantId
          status
          itemsTotal
          deliveryFee
          taxFee
          finalAmount
          addressId
          placedAt
        }
      }
      ... on UserNotRestaurantOwner { userId }
    }
  }
`

export const TODAY_RESTAURANT_ORDERS = gql`
  query TodayRestaurantOrders($params: GetTodayRestaurantOrdersInputParams!) {
    todayRestaurantOrders(params: $params) {
      __typename
      ... on OrderSummariesType {
        orderSummaries {
          orderId
          customerId
          restaurantId
          status
          itemsTotal
          deliveryFee
          taxFee
          finalAmount
          placedAt
          items {
            itemId
            quantity
            itemPrice
            subtotal
          }
        }
      }
      ... on UserNotRestaurantOwner { userId }
    }
  }
`

export const TODAY_RESTAURANT_SCHEDULED_ORDERS = gql`
  query TodayRestaurantScheduledOrders($params: GetTodayRestaurantScheduledOrdersInputParams!) {
    todayRestaurantScheduledOrders(params: $params) {
      __typename
      ... on ScheduledOrderSummariesType {
        orderSummaries {
          orderId
          customerId
          restaurantId
          status
          itemsTotal
          deliveryFee
          taxFee
          finalAmount
          placedAt
          scheduledFor
          items {
            itemId
            quantity
            itemPrice
            subtotal
          }
        }
      }
      ... on UserNotRestaurantOwner { userId }
    }
  }
`

// ---------- Promo codes ----------
export const GET_AVAILABLE_PROMO_CODES = gql`
  query GetAvailablePromoCodes {
    getAvailablePromoCodes {
      __typename
      ... on PromoCodesType {
        promoCodes {
          promoCodeId
          code
          discountType
          discountValue
          minOrderValue
          maxUsage
          validFrom
          validUntil
        }
      }
    }
  }
`

// ---------- Restaurant Dashboard ----------
export const GET_RESTAURANT_DASHBOARD = gql`
  query GetRestaurantDashboard($params: GetRestaurantDashboardInputParams!) {
    getRestaurantDashboard(params: $params) {
      __typename
      ... on RestaurantDashboardType {
        summary {
          totalOrders
          totalRevenue
          avgOrderValue
          totalCancelled
          cancellationRate
        }
        ordersByStatus { status count }
        ratingSummary { averageRating totalReviews distribution }
        peakHours { hour orderCount }
        topSelling { menuItemId quantity revenue }
      }
      ... on RestaurantNotFound { restaurantId }
      ... on InvalidDateRange { dateFrom dateTo }
      ... on UserNotRestaurantOwner { userId }
    }
  }
`
