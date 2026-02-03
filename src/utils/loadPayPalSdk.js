const paypalPromises = {};

export function loadPayPalSdk(clientId, account = 'india') {
    const namespace = `paypal_${account}`;

    if (window[namespace] && paypalPromises[namespace]) {
        return Promise.resolve();
    }

    if (!paypalPromises[namespace]) {
        paypalPromises[namespace] = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            // Important: Use data-namespace attribute instead of query parameter to avoid 400 errors
            script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription&currency=USD`;
            script.setAttribute('data-namespace', namespace);
            script.async = true;
            script.id = `paypal-sdk-${namespace}`;

            script.onload = () => {
                console.log(`✅ PayPal SDK (${namespace}) loaded successfully`);
                resolve();
            };
            script.onerror = () => {
                delete paypalPromises[namespace];
                reject(new Error(`PayPal SDK (${namespace}) failed to load`));
            };

            document.head.appendChild(script);
        });
    }

    return paypalPromises[namespace];
}
