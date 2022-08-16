# Submarine.js
Submarine.js is a Javascript library that targets the browser.

It's designed to make it easy for developers to integrate Shopify Plus stores with [Submarine](https://hub.getsubmarine.com), a platform for designing bespoke tokenised payment experiences like subscriptions, presales, and one-click upsells.
The platform (and this repository) is built and maintained by [Disco Labs](https://www.discolabs.com), a Shopify Plus partner agency.

# Table of Contents
  - [1.0 Usage](#10-usage)
    - [1.1 Initialisation](#11-initialisation)
    - [1.2 Authentication](#12-authentication)
    - [1.2.3 Making API Calls](#123-making-api-calls)
  - [2.0 Reference](#20-reference)
    - [2.1 Payment methods](#21-payment-methods)
      - [2.1.1 Get payment methods](#211-get-payment-methods)
      - [2.1.2 Create a payment method](#212-create-a-payment-method)
      - [2.1.3 Get a payment method](#213-get-a-payment-method)
      - [2.1.4 Update a payment method](#214-update-a-payment-method)
      - [2.1.5 Remove a payment method](#215-remove-a-payment-method)
    - [2.2 Subscriptions](#22-subscriptions)
      - [2.2.1 Get subscriptions](#221-get-subscriptions)
      - [2.2.2 Bulk update subscriptions](#222-bulk-update-subscriptions)
      - [2.2.3 Get a subscription](#223-get-a-subscription)
      - [2.2.4 Update a subscription](#224-update-a-subscription)
      - [2.2.5 Duplicate a subscription](#225-duplicate-a-subscription)
    - [2.3 Upsells](#23-upsells)
      - [2.3.1 Create an upsell](#231-create-an-upsell)
    - [2.4 Other](#24-other)
      - [2.4.1 Generate a payment processor client token](#241-generate-a-payment-processor-client-token)
  - [3.0 Development](#30-development)
  - [4.0 Licence](#40-licence)



## 1.0 Usage
Depending on how you're building your Shopify theme, you can integrate Submarine.js in a couple of different ways.

The first (and simplest) is to import the client library on the pages you want to interact with Submarine via a `<script>` tag, for example:

```html
<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/submarine-js@0.4.0-beta.2/dist/submarine.js"></script>
```

Alternatively, if you're using your own build process for your theme via Webpacker or similar, you can add Submarine.js as a dependency to your project and import it:

```shell
npm install @discolabs/submarine-js
```

or

```shell
yarn add @discolabs/submarine-js
```

and then:

```js
// assuming you're using ES modules
import { Submarine } from 'submarine-js';
```

## 1.1 Initialisation
The Submarine.js library provides a `Submarine` class, which should be initialised with environmental context so that API calls can successfully be made:

```js
const submarine = new Submarine.Submarine({
  environment: "staging",
  authentication: {
    customer_id: "6211133636859",
    shop: "submarine-js.myshopify.com"
  }
});
```

The `environment` initialisation option tells the client which API endpoint to make requests against.

The `authentication` initialisation options provides information about the context the client's being initialised in, specifically the authentication information for the currently logged in customer - see "Authentication" below.

## 1.2 Authentication
`submarine.js` using [Jason Web Tokens (JWTs)](https://jwt.io/) for authenticating client side requests, and returning sensitive customer information via the JWTs encoded `tokens`.

This allows for a secure environment to exchange customer, and shop information flow via the client.

Here's an example of how you can initialised the Submarine client library within a Liquid template in your **Shopify** theme:

```liquid
    <script src="{{ 'submarine.js' | asset_url }}"></script>

    <script>
      window.submarine = new window.Submarine.Submarine({
        environment: "dev",
        authentication: {
          shop: "{{ shop.permanent_domain }}",
          customer_id: "{{ customer.id }}"
        }
      });
     </script>
```

Once past this step you will be able to access your `subscriptions` via the `console`.

```js
  window.submarine.api.getSubscriptions(sub => console.log(sub));
```

Above will give you a list of your existing subscriptions attached to your initialised shop.

## 1.2.3 Making API Calls
Once you have an initialised client, making API calls is pretty simple:

```js
const submarine = new Submarine({ ...config });

submarine.api.getSubscriptions((subscriptions, errors) => {
  if(errors) {
    // handle errors here
    return;
  }

  // handle success here
  console.log(subscriptions);
});
```

All API calls take a `callback` function argument with a `(result, errors)` signature.
Your callback function should check for the presence of `errors`, handle it as needed, and otherwise process the `result`.

# 2.0 Reference
This section describes each of the API methods available via the client, their method signature, and an example usage.
Full details of all request/response parameters are available on the [Submarine Hub](https://hub.getsubmarine.com/reference).

## 2.1 Payment methods

### 2.1.1 Get payment methods
Get a list of payment methods for the currently authenticated customer.

```js
submarine.api.getPaymentMethods((paymentMethods, errors) => {
  // paymentMethods is an array of stored payment methods
});
```

### 2.1.2 Create a payment method
Create a new payment method for the currently authenticated customer.

```js
submarine.api.createPaymentMethod({
  payment_token: "abc123",
  payment_method_type: "credit-card",
  payment_processor: "stripe",
  status: "active"
}, (createdPaymentMethod, errors) => {
  // createdPaymentMethod is the newly stored payment method
});
```

Learn more about the attributes used to create a new payment method [here](https://hub.getsubmarine.com/docs/payment-method-endpoints#post-create-new-payment-method).

### 2.1.3 Get a payment method
Get the specified payment method for the currently authenticated customer.

```js
submarine.api.getPaymentMethod(1750, (paymentMethod, errors) => {
  // paymentMethod is the specified stored payment method
});
```

### 2.1.4 Update a payment method
Update the specified payment method for the currently authenticated customer.

```js
submarine.api.updatePaymentMethod(1750, {
    default: false,
    status: "disabled"
  },
  (paymentMethod, errors) => {
    // paymentMethod is the updated payment method
  }
);
```

### 2.1.5 Remove a payment method
Remove the specified payment method for the currently authenticated customer.

```js
submarine.api.removePaymentMethod(1750,
  (paymentMethod, errors) => {
    // paymentMethod is the removed payment method
  }
);
```

## 2.2 Subscriptions

### 2.2.1 Get subscriptions
Get a list of subscriptions for the currently authenticated customer.

```js
submarine.api.getSubscriptions((subscriptions, errors) => {
  // subscriptions is an array of subscriptions
});
```

### 2.2.2 Bulk update subscriptions
Update multiple subscriptions at once for the currently authenticated customer.

```js
submarine.api.bulkUpdateSubscriptions([1212, 1245], {
    payment_method_id: 345
  },
  (results, errors) => {
    // results is an object with two array attributes, `successes` and `failures`
  }
);
```

### 2.2.3 Get a subscription
Get a specific subscription for the currently authenticated customer.

```js
submarine.api.getSubscription(1212, (subscription, errors) => {
  // subscription is the specified subscription
});
```

### 2.2.4 Update a subscription
Update the specified subscription for the currently authenticated customer.

```js
submarine.api.updateSubscription(1212, {
    status: "paused"
  },
  (subscription, errors) => {
    // subscription is the updated subscription
  }
);
```

Learn more about the attributes used to update subscriptions [here](https://hub.getsubmarine.com/docs/building-subscription-management-into-your-customer-account-pages).

### 2.2.5 Duplicate a subscription
Duplicate the specified subscription for the currently authenticated customer.

```js
submarine.api.duplicateSubscription(1212,
  (subscription, errors) => {
    // subscription is the newly duplicated subscription
  }
);
```

## 2.3 Upsells

### 2.3.1 Create an upsell
Create an upsell for the specified order.

```js
submarine.api.createUpsell(394573949234, {
    variant_id: 2384723942,
    quantity: 2,
    notify_customer: false
  },
  (subscription, errors) => {
    // subscription is the newly duplicated subscription
  }
);
```

## 2.4 Other

### 2.4.1 Generate a payment processor client token
Generate a client token for the specified payment processor.

```js
submarine.api.generatePaymentProcessorClientToken('braintree',
  (clientToken, errors) => {
    // clientToken is a client-side token
  }
);
```

## 3.0 Development
Dependencies for this project are listed in the `package.json`.
Before you start developing, ensure you have [NPM](https://www.npmjs.com) and [Yarn](https://yarnpkg.com) installed, then:

```shell
git clone https://github.com/discolabs/submarine-js.git
cd submarine-js
yarn
```

The library uses [Vite](https://vitejs.dev) to provide a streamlined development experience with hot module reloading, alongside distribution building.

Running `yarn dev` from the command line will spin up a local development page that can be accessed from the browser.
This page also generates a set of development credentials that can be used to make real requests against the Submarine API from the browser.

## 4.0 Licence
The Submarine JavaScript API Client is an open-sourced software licensed under the [MIT license](LICENSE.md).
