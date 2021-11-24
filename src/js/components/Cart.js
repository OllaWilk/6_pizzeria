import { settings, select, classNames, templates } from './../settings.js';
import { utils } from './../utils.js';
import CartProduct from './CartProduct.js';

class Cart {
  constructor(element) {
    const thisCart = this;

    thisCart.products = [];
    thisCart.deliveryFee = settings.cart.defaultDeliveryFee;

    thisCart.getElements(element);
    thisCart.initActions();
    thisCart.update();
  }

  getElements(element) {
    const thisCart = this;

    thisCart.dom = {};

    thisCart.dom.wrapper = element;

    thisCart.dom.toggleTrigger = thisCart.dom.wrapper.querySelector(select.cart.toggleTrigger);
    thisCart.dom.productList = thisCart.dom.wrapper.querySelector(select.cart.productList);
    thisCart.dom.form = thisCart.dom.wrapper.querySelector(select.cart.form);
    thisCart.dom.phone = thisCart.dom.wrapper.querySelector(select.cart.phone);
    thisCart.dom.address = thisCart.dom.wrapper.querySelector(select.cart.address);


    thisCart.renderTotalsKeys = ['totalNumber', 'totalPrice', 'subtotalPrice', 'deliveryFee'];

    for(let key of thisCart.renderTotalsKeys){
      thisCart.dom[key] = thisCart.dom.wrapper.querySelectorAll(select.cart[key]);
    }
  }

  initActions() {
    const thisCart = this;
    thisCart.dom.toggleTrigger.addEventListener('click', () => thisCart.dom.wrapper.classList.toggle(classNames.cart.wrapperActive));

    thisCart.dom.productList.addEventListener('updated', () => thisCart.update());

    thisCart.dom.productList.addEventListener('remove', event => thisCart.remove(event.detail.cartProduct));

    thisCart.dom.form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (this.products.length === 0) {
        alert('Your cart is empty');
      } else {
        thisCart.sendOrder();
        thisCart.empty();
      }
    });
  }

  sendOrder() {
    const thisCart = this;

    const url = settings.db.url + '/' + settings.db.order;

    const payload = {
      phone: thisCart.dom.phone.value,
      address: thisCart.dom.address.value,
      totalPrice: thisCart.totalPrice,
      totalNumber: thisCart.totalNumber ,
      subtotalPrice: thisCart.subtotalPrice ,
      deliveryFee: thisCart.deliveryFee,
      products: [],
    };

    for (let product of thisCart.products) {
      payload.products.push(product.getData());
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options)
      .then((response) => {
        return response.json();
      })
      .then((parsedResponse) => {
        console.log('parseResponse', parsedResponse);
      });
  }

  empty() {
    const thisCart = this;

    thisCart.products.splice(0);

    thisCart.dom.productList.remove();

    thisCart.dom.phone.value = '';
    thisCart.dom.address.value = '';

    thisCart.update();
  }

  add(menuProduct) {
    const thisCart = this;

    const generatedHTML = templates.cartProduct(menuProduct);

    const generatedDOM = utils.createDOMFromHTML(generatedHTML);

    thisCart.dom.productList.appendChild(generatedDOM);

    thisCart.products.push(new CartProduct(menuProduct, generatedDOM));

    thisCart.update();
  }

  update() {
    const thisCart = this;

    thisCart.totalNumber = 0;
    thisCart.subtotalPrice = 0;

    for (let product of thisCart.products) {
      thisCart.subtotalPrice += product.price;
      thisCart.totalNumber += product.amount;
    }
    thisCart.totalPrice = thisCart.subtotalPrice + thisCart.deliveryFee;

    for (let key of thisCart.renderTotalsKeys) {
      for (let elem of thisCart.dom[key]) {
        elem.innerHTML = thisCart[key];
      }
    }
  }

  remove(cartProduct) {
    const thisCart = this;

    const index = thisCart.products.indexOf(cartProduct);
    console.log('index', index);

    const delElement = thisCart.products.splice(cartProduct, 1);
    console.log(delElement);

    cartProduct.dom.wrapper.remove();

    thisCart.update();
  }
}

export default Cart;