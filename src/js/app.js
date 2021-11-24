/* eslint-disable no-unused-vars */
/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars


// import Booking from './components/Booking';
{
  'use strict';

  const select = {
    templateOf: {
      menuProduct: '#template-menu-product',
      cartProduct: '#template-cart-product',
      bookingWidget: '#template-booking-widget',
    },
    containerOf: {
      menu: '#product-list',
      cart: '#cart',
      pages: '#pages',
      booking: '.booking-wrapper',
    },
    all: {
      menuProducts: '#product-list > .product',
      menuProductsActive: '#product-list > .product.active',
      formInputs: 'input, select',
    },
    menuProduct: {
      clickable: '.product__header',
      form: '.product__order',
      priceElem: '.product__total-price .price',
      imageWrapper: '.product__images',
      amountWidget: '.widget-amount',
      cartButton: '[href="#add-to-cart"]',
    },
    widgets: {
      amount: {
        input: 'input.amount', // CODE CHANGED
        linkDecrease: 'a[href="#less"]',
        linkIncrease: 'a[href="#more"]',
      },
      datePicker: {
        wrapper: '.date-picker',
        input: `input[name="date"]`,
      },
      hourPicker: {
        wrapper: '.hour-picker',
        input: 'input[type="range"]',
        output: '.output',
      },
    },
    cart: {
      productList: '.cart__order-summary',
      toggleTrigger: '.cart__summary',
      totalNumber: `.cart__total-number`,
      totalPrice: '.cart__total-price strong, .cart__order-total .cart__order-price-sum strong',
      subtotalPrice: '.cart__order-subtotal .cart__order-price-sum strong',
      deliveryFee: '.cart__order-delivery .cart__order-price-sum strong',
      form: '.cart__order',
      formSubmit: '.cart__order [type="submit"]',
      phone: '[name="phone"]',
      address: '[name="address"]',
    },
    cartProduct: {
      amountWidget: '.widget-amount',
      price: '.cart__product-price',
      edit: '[href="#edit"]',
      remove: '[href="#remove"]',
    },
    booking: {
      peopleAmount: '.people-amount',
      hoursAmount: '.hours-amount',
      tables: '.floor-plan .table',
    },
    nav: {
      links: '.main-nav a',
    },
  };

  const classNames = {
    menuProduct: {
      wrapperActive: 'active',
      imageVisible: 'active',
    },
    cart: {
      wrapperActive: 'active',
    },
    booking: {
      loading: 'loading',
      tableBooked: 'booked',
    },
    nav: {
      active: 'active',
    },
    pages: {
      active: 'active',
    },
  };

  const settings = {
    hours: {
      open: 12,
      close: 24,
    },
    amountWidget: {
      defaultValue: 1,
      defaultMin: 1,
      defaultMax: 9,
    },
    datePicker: {
      maxDaysInFuture: 14,
    },
    cart: {
      defaultDeliveryFee: 20,
    },
    booking: {
      tableIdAttribute: 'data-table',
    },
    db: {
      url: '//localhost:3131',
      product: 'product',
      order: 'order',
      booking: 'booking',
      event: 'event',
      dateStartParamKey: 'date_gte',
      dateEndParamKey: 'date_lte',
      notRepeatParam: 'repeat=false',
      repeatParam: 'repeat_ne=false',
    },
  };

  const templates = {
    menuProduct: Handlebars.compile(document.querySelector(select.templateOf.menuProduct).innerHTML),
    cartProduct: Handlebars.compile(document.querySelector(select.templateOf.cartProduct).innerHTML),
    bookingWidget: Handlebars.compile(document.querySelector(select.templateOf.bookingWidget).innerHTML),
  };

  class Product {
    constructor(id, data) {
      const thisProduct = this;

      thisProduct.id = id;
      thisProduct.data = data;

      thisProduct.renderInMenu();
      thisProduct.getElements();
      thisProduct.initAccordion();
      thisProduct.initOrderForm();
      thisProduct.initAmountWidget();
      thisProduct.processOrder();

    }

    renderInMenu() {
      const thisProduct = this;

      /* generate HTML based on template */
      const generatedHTML = templates.menuProduct(thisProduct.data);

      /* create element using utils.createElementFromHTML */
      thisProduct.element = utils.createDOMFromHTML(generatedHTML);

      /* find menu container */
      const menuContainer = document.querySelector(select.containerOf.menu);

      /* add element to menu */
      menuContainer.appendChild(thisProduct.element);
    }

    getElements() {

      const thisProduct = this;

      thisProduct.accordionTrigger = thisProduct.element.querySelector(select.menuProduct.clickable);
      thisProduct.form = thisProduct.element.querySelector(select.menuProduct.form);
      thisProduct.formInputs = thisProduct.form.querySelectorAll(select.all.formInputs);
      thisProduct.cartButton = thisProduct.element.querySelector(select.menuProduct.cartButton);
      thisProduct.priceElem = thisProduct.element.querySelector(select.menuProduct.priceElem);
      thisProduct.imageWrapper = thisProduct.element.querySelector(select.menuProduct.imageWrapper);
      thisProduct.amountWidgetElem = thisProduct.element.querySelector(select.menuProduct.amountWidget);
    }

    initAccordion() {
      const thisProduct = this;

      thisProduct.accordionTrigger.addEventListener('click', (event) => {

        event.preventDefault();

        thisProduct.element.classList.toggle(classNames.menuProduct.wrapperActive);

        const activeProducts = document.querySelectorAll(select.all.menuProductsActive);

        activeProducts.forEach((activeProduct) => {
          if( activeProduct !== thisProduct.element) {
            activeProduct.classList.remove(classNames.menuProduct.wrapperActive);
          }
        });
      });
    }

    initOrderForm(){
      const thisProduct = this;

      thisProduct.form.addEventListener('submit', function(event){
        event.preventDefault();
        thisProduct.processOrder();
      });

      for(let input of thisProduct.formInputs){
        input.addEventListener('change', function(){
          thisProduct.processOrder();
        });
      }

      thisProduct.cartButton.addEventListener('click', function(event){
        event.preventDefault();
        thisProduct.processOrder();
        thisProduct.addToCart();
      });
    }

    initAmountWidget() {
      const thisProduct = this;

      thisProduct.amountWidget = new AmountWidget(thisProduct.amountWidgetElem);
      thisProduct.amountWidgetElem.addEventListener('updated', () => thisProduct.processOrder());
    }

    processOrder() {
      const thisProduct = this;

      /* read all data from the form (using utils.serializeFormToObject) and save it to const formData */
      const formData = utils.serializeFormToObject(thisProduct.form);

      /* set variable price to equal thisProduct.data.price */
      thisProduct.params = {};
      let price = thisProduct.data.price;

      /* START LOOP: for each paramId in thisProduct.data.params */
      for (let paramId in thisProduct.data.params) {

        /* save the element in thisProduct.data.params with key paramId as const param */
        const param = thisProduct.data.params[paramId];

        /* START LOOP: for each optionId in param.options */
        for (let optionId in param.options) {
          /* save the element in param.options with key optionId as const option */
          const option = param.options[optionId];
          const optionSelected = formData.hasOwnProperty(paramId) && formData[paramId].indexOf(optionId) > -1;
          /* START IF: if option is selected and option is not default */
          if (optionSelected && !option.default) {
            /* add price of option to variable price */
            price += option.price;
            /* END IF: if option is selected and option is not default */
          }
          /* START ELSE IF: if option is not selected and option is default */
          else if (!optionSelected && option.default) {
            /* deduct price of option from price */
            price -= option.price;
            /* END ELSE IF: if option is not selected and option is default */
          }

          const imageWrappers = thisProduct.imageWrapper.querySelector(`.${paramId}-${optionId}`);
          if (optionSelected && imageWrappers) {
            if (!thisProduct.params[paramId]) {
              thisProduct.params[paramId] = {
                label: param.label,
                options: {},
              };
            }
            thisProduct.params[paramId].options[optionId] = option.label;
            imageWrappers.classList.add(classNames.menuProduct.imageVisible);
          } else if (imageWrappers) {
            imageWrappers.classList.remove(classNames.menuProduct.imageVisible);
          }
          /* END LOOP: for each optionId in param.options */
        }
        /* END LOOP: for each paramId in thisProduct.data.params */
      }
      /* multiply price by amount */
      thisProduct.priceSingle = price;
      thisProduct.price = thisProduct.priceSingle * thisProduct.amountWidget.value;
      /* set the contents of thisProduct.priceElem to be the value of variable price */
      thisProduct.priceElem.innerHTML = thisProduct.price;

    }

    addToCart() {
      const thisProduct = this;

      thisProduct.name = thisProduct.data.name;
      thisProduct.amount = thisProduct.amountWidget.value;

      app.cart.add(thisProduct);
    }
  }

  class BaseWidget {
    constructor(wrapperElement, initialValue) {
      const thisWidget = this;

      thisWidget.dom = {};
      thisWidget.dom.wrapper = wrapperElement;

      thisWidget.correctValue = initialValue;
    }


    get value() {
      const thisWidget = this;

      return thisWidget.correctValue;
    }
    set value(value) {
      const thisWidget = this;

      const newValue = thisWidget.parseValue(value);

      /* validation */
      if (newValue !== thisWidget.correctValue && thisWidget.isValid(newValue)) {
        thisWidget.correctValue = newValue;
        this.announce();
      }
      thisWidget.renderValue();
    }

    setValue(value) {
      const thisWidget = this;
      thisWidget.value = value;
    }

    parseValue(value) {
      return parseInt(value);

    }

    isValid(value) {
      return !isNaN(value);
    }

    renderValue() {
      const thisWidget = this;
      thisWidget.dom.wrapper.innerHTML = thisWidget.value;
    }

    announce() {
      const thisWidget = this;

      const event = new CustomEvent('updated', {
        bubbles: true
      });
      thisWidget.dom.wrapper.dispatchEvent(event);
    }

  }

  class AmountWidget extends BaseWidget{
    constructor(element) {
      super(element, settings.amountWidget.defaultValue);
      const thisWidget = this;

      thisWidget.getElements(element);

      thisWidget.initActions();
    }

    getElements(){
      const thisWidget = this;

      thisWidget.dom.input = thisWidget.dom.wrapper.querySelector(select.widgets.amount.input);
      thisWidget.dom.linkDecrease = thisWidget.dom.wrapper.querySelector(select.widgets.amount.linkDecrease);
      thisWidget.dom.linkIncrease = thisWidget.dom.wrapper.querySelector(select.widgets.amount.linkIncrease);
    }


    isValid(value) {
      return !isNaN(value)
        && value >= settings.amountWidget.defaultMin
        && value <= settings.amountWidget.defaultMax;
    }

    renderValue() {
      const thisWidget = this;
      thisWidget.dom.input.value = thisWidget.value;
    }

    initActions() {
      const thisWidget = this;

      thisWidget.dom.input.addEventListener('change', () => thisWidget.value = thisWidget.dom.input.value);
      thisWidget.dom.linkDecrease.addEventListener('click',(event) => {
        event.preventDefault();
        thisWidget.setValue(thisWidget.value - 1);
      });
      thisWidget.dom.linkIncrease.addEventListener('click', (event) => {
        event.preventDefault();
        thisWidget.setValue(thisWidget.value + 1);
      });
    }
  }

  class DatePicker extends BaseWidget {
    constructor(wrapper) {
      super(wrapper, utils.dateToStr(new Date()));
      const thisWidget = this;

      thisWidget.dom.input = thisWidget.dom.wrapper.querySelector(select.widgets.datePicker.input);

      thisWidget.initPlugin();
    }

    initPlugin() {
      const thisWidget = this;

      thisWidget.minDate = new Date(thisWidget.value);
      thisWidget.maxDate = utils.addDays(thisWidget.minDate, settings.datePicker.maxDaysInFuture);

      const options = {
        defaultDate: thisWidget.minDate,
        minDate: thisWidget.minDate,
        maxDate: thisWidget.maxDate,
        disable: [
          function(date) {
            return(date.getDay() === 1);
          }
        ],
        locale: {
          firstDayOfWeek: 1
        },
        onChange: function(selectedDates, dateStr) {
          thisWidget.value = dateStr;
        }
      };
      // eslint-disable-next-line no-undef
      flatpickr(thisWidget.dom.input,options);

    }
    parseValue(value) {
      return value;
    }

    isValid(value){
      return value;
    }
    renderValue() {
      console.log();
    }
  }

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

  class CartProduct {
    constructor(menuProduct, element) {
      const thisCartProduct = this;

      thisCartProduct.id = menuProduct.id;
      thisCartProduct.name = menuProduct.name;
      thisCartProduct.price = menuProduct.price;
      thisCartProduct.priceSingle = menuProduct.priceSingle;
      thisCartProduct.amount = menuProduct.amount;

      thisCartProduct.params = JSON.parse(JSON.stringify(menuProduct.params));

      thisCartProduct.getElements(element);
      thisCartProduct.initAmountWidget();
      thisCartProduct.initActions();
    }

    getElements(element) {
      const thisCartProduct = this;

      thisCartProduct.dom = [];
      // thisCartProduct.dom = {};

      thisCartProduct.dom.wrapper = element;
      thisCartProduct.dom.amountWidget = thisCartProduct.dom.wrapper.querySelector(select.cartProduct.amountWidget);
      thisCartProduct.dom.price = thisCartProduct.dom.wrapper.querySelector(select.cartProduct.price);
      thisCartProduct.dom.edit = thisCartProduct.dom.wrapper.querySelector(select.cartProduct.edit);
      thisCartProduct.dom.remove = thisCartProduct.dom.wrapper.querySelector(select.cartProduct.remove);
    }

    initAmountWidget() {
      const thisCartProduct = this;

      thisCartProduct.amountWidget = new AmountWidget(thisCartProduct.dom.amountWidget);

      thisCartProduct.dom.amountWidget.addEventListener('updated', () => {
        thisCartProduct.amount = thisCartProduct.amountWidget.value;
        thisCartProduct.price = thisCartProduct.priceSingle * thisCartProduct.amount;
        thisCartProduct.dom.price.innerHTML = thisCartProduct.price;
      });
    }

    initActions() {
      const thisCartProduct = this;

      thisCartProduct.dom.edit.addEventListener('click', event => event.preventDefault()); //TO DO finish edit button
      thisCartProduct.dom.remove.addEventListener('click', (event)=>{
        event.preventDefault();
        thisCartProduct.remove();
      });
    }

    remove() {
      const thisCartProduct = this;

      const event = new CustomEvent('remove', {
        bubbles: true,
        detail: {
          cartProduct: thisCartProduct,
        }
      });

      thisCartProduct.dom.wrapper.dispatchEvent(event);

    }

    getData() {
      const thisCartProduct = this;

      const productAddedData = {
        productInfo: {
          id: thisCartProduct.id,
          amount: thisCartProduct.amount,
          price: thisCartProduct.price,
          priceSingle: thisCartProduct.priceSingle,
          params: thisCartProduct.params,
        }
      };
      return productAddedData;
    }
  }

  class Booking {
    constructor(bookingReservation) {
      const thisBooking = this;

      thisBooking.render(bookingReservation);
      thisBooking.initWidgets();
    }

    render(element) {
      const thisBooking = this;

      const generatedHTML = templates.bookingWidget();

      thisBooking.dom = {};
      thisBooking.dom.wrapper = element;
      thisBooking.dom.wrapper.innerHTML = generatedHTML;
      thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(select.booking.peopleAmount);
      thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(select.booking.hoursAmount);
      thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
      thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);

    }

    initWidgets() {
      const thisBooking = this;

      thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
      thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);

      thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
      thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);
    }
  }

  class HourPicker extends BaseWidget {
    constructor(wrapper) {
      super(wrapper, settings.hours.open);

      const thisWidget = this;

      thisWidget.dom.input = thisWidget.dom.wrapper.querySelector(select.widgets.hourPicker.input);
      thisWidget.dom.output = thisWidget.dom.wrapper.querySelector(select.widgets.hourPicker.output);

      thisWidget.initPlugin();
      thisWidget.value = thisWidget.dom.input.value;
    }

    initPlugin() {
      const thisWidget = this;
      // eslint-disable-next-line no-undef
      rangeSlider.create(thisWidget.dom.input);

      thisWidget.dom.input.addEventListener('input', function() {
        thisWidget.value = thisWidget.dom.input.value;
      });

    }

    parseValue(value) {
      const hour = utils.numberToHour(value);
      return hour;
    }

    isValid() {
      return true;
    }

    renderValue(){
      const thisWidget = this;

      thisWidget.dom.output.innerHTML = thisWidget.value;
    }
  }


  const app = {

    initBooking: function () {
      const thisApp = this;

      const bookingReservation = document.querySelector(select.containerOf.booking);
      thisApp.booking = new Booking(bookingReservation);

    },

    initPages: function () {
      const thisApp = this;

      thisApp.pages = document.querySelector(select.containerOf.pages).children;
      thisApp.navLinks = document.querySelectorAll(select.nav.links);

      const idFromHash = window.location.hash.replace('#/', '');

      let pageMatchingHash = thisApp.pages[0].id;
      for (let page of thisApp.pages) {
        if (page.id === idFromHash) {
          pageMatchingHash = page.id;
          break;
        }
      }

      thisApp.activatePage(idFromHash);



      for (let link of thisApp.navLinks) {
        link.addEventListener('click', function (event) {
          const clickedElement = this;
          event.preventDefault();

          // get page id from href attribute
          const id = clickedElement.getAttribute('href').replace('#','');
          //run thisApp.activatePage with that id
          thisApp.activatePage(id);
          // change URL hash
          window.location.hash = '#/' + id;
        });
      }

    },
    initData: function() {
      const thisApp = this;
      thisApp.data = {};
      const url = settings.db.url + '/' + settings.db.product;

      fetch(url)
        .then(function (rawResponse) {
          return rawResponse.json();
        })
        .then(function (parsedResponse) {
          console.log('parsedResponse', parsedResponse);
          /* save parsedResponse as thisApp.data.products */
          thisApp.data.products = parsedResponse;
          /* execute initMenu method*/
          thisApp.initMenu();
        });
      console.log('thisApp.data', JSON.stringify(thisApp.data));
    },

    activatePage: function (pageId) {
      const thisApp = this;

      //add class active to matching pages, remove from non-matching
      for (let page of thisApp.pages) {
        page.classList.toggle(classNames.pages.active, page.id === pageId);
      }
      //add class active to matching links, remove from non-matching
      for (let link of thisApp.navLinks) {
        link.classList.toggle(
          classNames.nav.active,
          link.getAttribute('href') === '#' + pageId
        );

      }

    },
    initMenu: function () {
      const thisApp = this;

      for(let productData in thisApp.data.products) {
        new Product( thisApp.data.products[productData].id, thisApp.data.products[productData]);

      }
    },
    initCart: function () {
      const thisApp = this;

      const cartElem = document.querySelector(select.containerOf.cart);
      thisApp.cart = new Cart(cartElem);

    },
    init: function(){
      const thisApp = this;

      thisApp.initPages();
      thisApp.initData();
      thisApp.initCart();
      thisApp.initBooking();
    },
  };

  app.init();
}
