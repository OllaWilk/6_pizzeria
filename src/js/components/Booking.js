import { utils } from '../utils.js';
import {select, settings, templates, classNames} from './../settings.js';
import AmountWidget from './AmountWidget.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';

class Booking {
  constructor(bookingReservation) {
    this.render(bookingReservation);
    this.initWidgets();
    this.getData();
    this.bookTable();
    this.initAction();
  }

  render(bookingElem) {
    const generatedHTML = templates.bookingWidget();

    this.dom = {};

    this.dom.wrapper = bookingElem;
    this.dom.wrapper.innerHTML = generatedHTML;
    this.dom.peopleAmount = this.dom.wrapper.querySelector(select.booking.peopleAmount);
    this.dom.hoursAmount = this.dom.wrapper.querySelector(select.booking.hoursAmount);
    this.dom.datePicker = this.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
    this.dom.hourPicker = this.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);

    this.dom.tables = this.dom.wrapper.querySelectorAll(select.booking.tables);

    this.dom.peopleAmountInput = this.dom.wrapper.querySelector(select.booking.peopleAmountInput);
    this.dom.hourAmountInput = this.dom.wrapper.querySelector(select.booking.hourAmountInput);
    this.dom.starters = this.dom.wrapper.querySelectorAll(select.booking.starters);
    this.dom.phone = this.dom.wrapper.querySelector(select.booking.phoneInput);
    this.dom.address = this.dom.wrapper.querySelector(select.booking.addressInput);
    this.dom.submitForm = this.dom.wrapper.querySelector(select.booking.submitForm);
  }

  initWidgets() {
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);
    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);
    thisBooking.dom.wrapper.addEventListener('updated', function() {
      thisBooking.updateDOM();
    });
  }

  getData() {
    const thisBooking = this;

    const startDateParam = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePicker.minDate);
    const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePicker.maxDate);

    const params = {
      booking: [
        startDateParam,
        endDateParam,
      ],
      eventsCurrent: [
        settings.db.notRepeatParam,
        startDateParam,
        endDateParam,
      ],
      eventsRepeat: [
        settings.db.repeatParam,
        endDateParam,
      ],
    };

    // console.log('data params', params);

    const urls = {
      booking: `${settings.db.url}/${settings.db.booking}?${params.booking.join('&')}`,
      eventsCurrent: `${settings.db.url}/${settings.db.event}?${params.eventsCurrent.join('&')}`,
      eventsRepeat: `${settings.db.url}/${settings.db.event}?${params.eventsRepeat.join('&')}`,
    };

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then( (allResponses) => {
        const bookinsResponse = allResponses[0];
        const eventsCurrentResponse = allResponses[1];
        const eventsRepeatResponse = allResponses[2];

        return Promise.all([
          bookinsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })
      .then( ([bookings,eventsCurrent ,eventsRepeat]) => {
        // console.log('bookings', bookings);
        // console.log('eventsCurrent', eventsCurrent);
        // console.log('eventsRepeat', eventsRepeat);
        this.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData( bookings, eventsCurrent, eventsRepeat ) {
    const thisBooking = this;

    thisBooking.booked = {};

    for (let item of bookings) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }
    for (let item of eventsCurrent) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;

    for (let item of eventsRepeat) {
      if (item.repeat === 'daily') {
        for (let loopDate = minDate; loopDate <= maxDate;loopDate = utils.addDays(loopDate, 1)) {
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);

        }
      }
    }

    // console.log('this.booked', thisBooking.booked);
    this.updateDOM();
  }

  bookTable() {
    this.currentDate = this.datePicker.value;
    const chosenHour = this.hourPicker.value;
    const newHour = this.hourPicker.value;

    console.log('this.date', this.date);
    console.log('chosenHour', chosenHour);
    console.log('newHour', newHour);
    /*select table*/

    for (let table of this.dom.tables) {

      table.addEventListener('click', () => {
        const bookedTable = table.classList.contains(classNames.booking.tableBooked);

        if ( !bookedTable ) {
          table.classList.toggle(classNames.booking.selectedTable);

          this.tableSelected = table.getAttribute(settings.booking.tableIdAttribute);

        } else {
          alert('This table is booked. Please pick another.');
        }
      });
    }

  }

  makeBooked(date, hour, duration, table) {

    if (typeof this.booked[date] === 'undefined') {
      this.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);

    for (let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5) {

      if (typeof this.booked[date][hourBlock] === 'undefined') {
        this.booked[date][hourBlock] = [];
      }

      this.booked[date][hourBlock].push(table);
      // console.log('loop', hourBlock);
    }
  }

  sendReservation() {
    console.log('send reserwation');

    const url = `${settings.db.url}/${settings.db.booking}`;

    console.log(url);

    const booking = {
      date: this.datePicker.value,
      hour: this.hourPicker.value,
      table: this.tableSelected,
      repeat: false,
      duration: this.dom.hourAmountInput.value,
      people: this.dom.peopleAmountInput.value,
      starters: [],
      adress: this.dom.address.value,
      phone: this.dom.phone.value,
    };

    console.log(booking);

    this.dom.starters.forEach(starter => {


      if (starter.checked === true) {
        booking.starters.push(starter.value);
      }
    });
  }

  updateDOM() {

    this.date = this.datePicker.value;

    this.hour = utils.hourToNumber(this.hourPicker.value);

    let allAvailable = false;

    // console.log('allAvailable', allAvailable);

    if (
      typeof this.booked[this.date] === 'undefined'
      ||
      typeof this.booked[this.date][this.hour] === 'undefined'
    ) {
      allAvailable = true; utils.hourToNumber(this.hourPicker.value);
    }

    for (let table of this.dom.tables) {
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if (!isNaN(tableId)) {
        tableId = parseInt(tableId);
      }

      if (!allAvailable && this.booked[this.date][this.hour].includes(tableId)) {
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
      }
    }
  }

  initAction() {
    const thisBooking = this;

    thisBooking.dom.submitForm.addEventListener('click', (e) => {
      e.preventDefault();
      thisBooking.sendReservation();
    });
  }
}

export default Booking;