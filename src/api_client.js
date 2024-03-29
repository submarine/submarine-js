import { Store } from 'json-api-models';

// Constants for possible HTTP methods.
const GET = 'GET';
const POST = 'POST';
const PATCH = 'PATCH';
const PUT = 'PUT';
const DELETE = 'DELETE';

// Constants for Submarine API endpoints across environments.

const API_ENDPOINTS = {
  production: 'https://submarine.discolabs.com/api/v1',
  staging: 'https://submarine-staging.discolabs.com/api/v1',
  uat: 'https://submarine-uat.discolabs.com/api/v1'
};

// Definition of all possible API calls and their method and path.
const API_METHODS = {
  get_payment_methods: {
    http_method: GET,
    endpoint: '/customers/{{ customer_id }}/payment_methods.json'
  },
  create_payment_method: {
    http_method: POST,
    endpoint: '/customers/{{ customer_id }}/payment_methods.json'
  },
  get_payment_method: {
    http_method: GET,
    endpoint: '/customers/{{ customer_id }}/payment_methods/{{ id }}.json'
  },
  update_payment_method: {
    http_method: PATCH,
    endpoint: '/customers/{{ customer_id }}/payment_methods/{{ id }}.json'
  },
  remove_payment_method: {
    http_method: DELETE,
    endpoint: '/customers/{{ customer_id }}/payment_methods/{{ id }}.json'
  },
  get_subscription: {
    http_method: GET,
    endpoint: '/customers/{{ customer_id }}/subscriptions/{{ id }}.json'
  },
  get_subscriptions: {
    http_method: GET,
    endpoint: '/customers/{{ customer_id }}/subscriptions.json'
  },
  duplicate_subscription: {
    http_method: POST,
    endpoint: '/customers/{{ customer_id }}/subscriptions/{{ id }}/duplicate.json'
  },
  update_subscription: {
    http_method: PUT,
    endpoint: '/customers/{{ customer_id }}/subscriptions/{{ id }}.json'
  },
  bulk_update_subscriptions: {
    http_method: POST,
    endpoint: '/customers/{{ customer_id }}/subscriptions/bulk_update.json'
  },
  cancel_subscription: {
    http_method: DELETE,
    endpoint: '/customers/{{ customer_id }}/subscriptions/{{ id }}.json'
  },
  create_upsell: {
    http_method: POST,
    endpoint: '/customers/{{ customer_id }}/orders/{{ order_id }}/upsells.json'
  },
  generate_payment_processor_client_token: {
    http_method: POST,
    endpoint: '/payment_processor_client_tokens.json',
    query_params_override: {
      customer_id: undefined
    }
  },
  create_preliminary_payment_method: {
    http_method: POST,
    endpoint: '/preliminary_payment_methods.json',
    query_params_override: {
      customer_id: undefined
    }
  }
};

// Return the appropriate API URL for the given environment, API method and context.
const getMethodUrl = (environment, method, context) =>
  Object.entries(context).reduce((method_url, contextValue) => {
    const [k, v] = contextValue;
    return method_url.replace(new RegExp(`{{ ${k} }}`, 'g'), v);
  }, [API_ENDPOINTS[environment], API_METHODS[method].endpoint].join(''));

// Return a querystring that can be appended to an API endpoint.
const buildQueryString = params => {
  const queryString = Object.keys(params)
    .filter(key => params[key] !== undefined)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  return `?${queryString}`;
};

// Return the appropriate HTTP method (GET, POST, DELETE etc) for the given API method.
const getMethodHttpMethod = method => API_METHODS[method].http_method;

// Return the appropriate request payload for the given HTTP method and data.
const getMethodPayload = (http_method, data) => {
  if ([GET, DELETE].includes(http_method)) {
    return null;
  }
  return JSON.stringify(data);
};

// Synchronise a top-level data object returned from a JSON API.
const synchroniseData = (models, data) => {
  // if the data object isn't a JSON-API object, return as-is
  if(data === null || data === undefined || typeof data !== 'object' || data.data === undefined) {
    return data;
  }

  // we know we have a data array or singular data object, so synchronise it
  const synchronisedData = models.sync(data);

  // synchronise the individual attributes of the now locally synchronised model
  if(Array.isArray(synchronisedData)) {
    synchronisedData.forEach(model => synchroniseModelAttributes(models, model));
  } else {
    synchroniseModelAttributes(models, synchronisedData);
  }

  // return the top-level object
  return synchronisedData;
};

// Iterate through the individual attributes of a JSON API model and parse/sync them.
const synchroniseModelAttributes = (models, model) => {
  Object.keys(model.attributes).forEach(attribute => {
    model.attributes[attribute] = synchroniseData(models, model.attributes[attribute]);
  });
};

// The API client class.
export class ApiClient {

  // Instantiate the API client from an options object.
  constructor({ authentication, environment }) {
    this.authentication = authentication;
    this.environment = environment;
    this.models = new Store();
  }

  // Execute an API request against the Submarine API.
  async execute(method, data, context, callback) {
    const url = getMethodUrl(this.environment, method, context);
    const http_method = getMethodHttpMethod(method);
    const queryParams = this.buildQueryParams(method, http_method, data);
    const payload = getMethodPayload(http_method, data);

    let tokenResult = await this.fetchJWTToken();
      
    if (tokenResult.errors) {
      callback && callback(null, tokenResult.errors);
      return;
    }

    return fetch(url + buildQueryString(queryParams), {
      method: http_method,
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${tokenResult.token}`
      },
      body: payload
    })
      .then(response => {
        response.json()
          .then(async json => {

            if (response.status === 401) {
                callback && callback(null, json.errors);
                return;
            }

            if (json && json.errors) {
              callback && callback(null, json.errors);
              return;
            }

            if(response.status === 400 || response.status === 422 || response.status === 500) {
              callback && callback(null, [json]);
              return;
            }

            const result = synchroniseData(this.models, json);
            callback && callback(result, null);
          });
      });
  }

  async fetchJWTToken() {
    let result = { token: null, errors: null };

    try {
      const response = await fetch('/apps/submarine/auth/tokens');

      if (!response.ok) {
        result = { ...result, errors: `HTTP error : ${response.status}` }
      } else {
        let token = await response.text();
        result = { ...result, token };
      }
      
    } catch (error) {
      result = { ...result, errors: error.message }
    }
  
    return result;
    
  };

  // Build query parameters for a given request, including authentication information.
  buildQueryParams(method, http_method, data) {
    return Object.assign(
      {},
      this.authentication,
      http_method === GET ? data : {},
      API_METHODS[method].query_params_override || {}
    );
  }

  // Get a list of payment methods for the currently authenticated customer.
  getPaymentMethods(callback) {
    const context = { ...this.authentication };

    return this.execute(
      'get_payment_methods',
      {},
      context,
      callback
    );
  }

  // Create a new payment method for the currently authenticated customer.
  createPaymentMethod(customer_payment_method, callback) {
    const context = { ...this.authentication };

    return this.execute(
      'create_payment_method',
      customer_payment_method,
      context,
      callback
    );
  }

  // Get the specified payment method for the currently authenticated customer.
  getPaymentMethod(id, callback) {
    const context = { ...this.authentication, id };

    return this.execute(
      'get_payment_method',
      {},
      context,
      callback
    );
  }

  // Update the specified payment method for the currently authenticated customer.
  updatePaymentMethod(id, paymentMethod, callback) {
    const context = { ...this.authentication, id };

    return this.execute(
      'update_payment_method',
      paymentMethod,
      context,
      callback
    );
  }

  // Remove the specified payment method for the currently authenticated customer.
  removePaymentMethod(id, callback) {
    const context = { ...this.authentication, id };

    return this.execute(
      'remove_payment_method',
      {},
      context,
      callback
    );
  }

  // Get a list of subscriptions for the currently authenticated customer.
  getSubscriptions(callback, params = {}) {
    const context = { ...this.authentication };

    return this.execute(
      'get_subscriptions',
      { ...params },
      context,
      callback
    );
  }

  // Update multiple subscriptions at once for the currently authenticated customer.
  bulkUpdateSubscriptions(subscription_ids, subscription, callback) {
    const context = { ...this.authentication };

    const payload = {
      bulk_update: {
        subscription_ids,
        subscription
      }
    };

    return this.execute(
      'bulk_update_subscriptions',
      payload,
      context,
      callback
    );
  }

  // Get a specific subscription for the currently authenticated customer.
  getSubscription(id, callback) {
    const context = { ...this.authentication, id };

    return this.execute(
      'get_subscription',
      {},
      context,
      callback
    );
  }

  // Update the specified subscription for the currently authenticated customer.
  updateSubscription(id, subscription, callback) {
    const context = { ...this.authentication, id };

    return this.execute(
      'update_subscription',
      subscription,
      context,
      callback
    );
  }

  // Cancel the specified subscription for the currently authenticated customer.
  cancelSubscription(id, callback) {
    console.log('[Warning]: Calling the `cancelSubscription` method is deprecated in favour of calling `updateSubscription` with a `status` value of `cancelled`.');

    const context = { ...this.authentication, id };

    return this.execute(
      'cancel_subscription',
      {},
      context,
      callback
    );
  }

  // Duplicate the specified subscription for the currently authenticated customer.
  duplicateSubscription(id, callback) {
    const context = { ...this.authentication, id };

    return this.execute(
      'duplicate_subscription',
      {},
      context,
      callback
    );
  }

  // Create an upsell for the specified order.
  createUpsell(order_id, upsell, callback) {
    const context = { ...this.authentication, order_id };

    const payload = {
      data: {
        type: 'upsell',
        attributes: upsell
      }
    };

    return this.execute(
      'create_upsell',
        payload,
      context,
      callback
    );
  }

  // Generate a client token for the specified payment processor.
  generatePaymentProcessorClientToken(payment_processor, callback) {
    const payload = {
      data: {
        type: 'payment_processor_client_token',
        attributes: { payment_processor }
      }
    };

    return this.execute(
      'generate_payment_processor_client_token',
      payload,
      {},
      callback
    );
  }

  // Create a preliminary payment method for an in-progress checkout.
  //
  // This method is only required during checkout and is typically invoked by Submarine's checkout
  // library - it shouldn't need to be called by partner or merchant code.
  createPreliminaryPaymentMethod(preliminary_payment_method, callback) {
    return this.execute(
      'create_preliminary_payment_method',
      preliminary_payment_method,
      {},
      callback
    );
  }
}
