const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent,
);

const envName = $('#select option:selected').text().toLowerCase();
const preferredCountries = [''];

// console.log('*** envName: ', envName);

if (envName === 'stage') {
  // add custom country
  const countryData = window.intlTelInputGlobals.getCountryData();

  countryData.push({
    name: 'Wonderland',
    iso2: 'ww',
    dialCode: '999',
    priority: 0,
    areaCodes: null,
    nodeById: {},
  });

  preferredCountries.push('ww');
}

function showViettelLegal(code) {
  if (code == 'vn') {
    $('.viettel-legal').css('display', 'block');
  } else {
    $('.viettel-legal').css('display', 'none');
  }
}

function showConsentPage() {
  Swal.fire({
    title: '',
    html: "<div class='consent-page'><iframe src='https://www.ipification.com/consents/vn-viettel-001-vi.html' title=''></iframe></div>",
    showConfirmButton: false,
    showCloseButton: true,
    // heightAuto: false
  });
}

function initPhoneInput(input) {
  $.get('/geoip', function (data) {
    var countryCode = data ? data.country : 'rs';
    showViettelLegal(countryCode);
    if (!preferredCountries.includes(countryCode)) preferredCountries.push(countryCode);

    window.intlTelInput(input, {
      formatOnDisplay: true,
      // initialCountry: "us",
      showSelectedDialCode: true,
      initialCountry: envName === 'live' ? 'auto' : 'ww',
      geoIpLookup: function (success, failure) {
        success(countryCode);
      },
      customPlaceholder: function (selectedCountryPlaceholder, selectedCountryData) {
        return selectedCountryData.name === 'Wonderland' ? '123456789' : selectedCountryPlaceholder;
      },
      preferredCountries: preferredCountries,
      separateDialCode: true,
      utilsScript: '/js/lib/intl-tel-input-20.0.5/js/utils.js',
    });

    input.addEventListener('countrychange', function () {
      var itic = window.intlTelInputGlobals.getInstance(input);
      const country = itic.getSelectedCountryData();
      showViettelLegal(country.iso2);
    });
  });
}

function randomstring(L) {
  var s = '';
  var randomchar = function () {
    var n = Math.floor(Math.random() * 62);
    if (n < 10) return n; //1-10
    if (n < 36) return String.fromCharCode(n + 55); //A-Z
    return String.fromCharCode(n + 61); //a-z
  };
  while (s.length < L) s += randomchar();
  return s;
}

function goto_link(url) {
  $('.wrapper-loader').addClass('show');
  window.location.href = url;
}

function choose_option(selector) {
  $('.btn').removeClass('btn-active');
  $('.btn_' + selector).addClass('btn-active');
}

$(document).ready(function () {
  // country phone setting library
  document.querySelectorAll('.phoneNumber').forEach((el) => {
    initPhoneInput(el);
  });

  $('.info-icon').on('click', function () {
    $('#app_info').modal('show');
  });

  $('.btn-user-flow').click(function () {
    var user_flow = $(this).data('user-flow');
    var phone_number;
    var dialCode;

    if (['pvn_ip', 'pvn_ip_plus', 'pvn_im', 'kyc_phone'].indexOf(user_flow) >= 0) {
      var parent = $(this).closest('.block-button');
      var inputPhone = parent.find('input.phoneNumber');

      if (inputPhone.length >= 0) {
        var iti = window.intlTelInputGlobals.getInstance(inputPhone[0]);
        phone_number = iti.getNumber();
        dialCode = iti.getSelectedCountryData().dialCode
        phone_number = (phone_number || '').replace(/[ +]/g, '');

        if (!phone_number || phone_number == '') {
          $('.wrapper-loader').removeClass('show');
          $('#input_alert').modal('show');
          return;
        }

        if (!iti.isValidNumber() && dialCode !== '999') {
          $('.wrapper-loader').removeClass('show');
          $('#phone_invalid_alert').modal('show');
          return;
        }
      }
    }

    localStorage.setItem('selector', location.hash.substring(1));
    var data_title = $(this).attr('data-title');

    var params = new URLSearchParams({
      user_flow: user_flow,
    });

    if (phone_number) params.set('phone',dialCode==='999' ? dialCode + phone_number : phone_number);

    var redirectURL = base_url + '/auth/start';

    if (isMobile || user_flow === 'pvn_im' || user_flow === 'login_im') {
      params.set('state', randomstring(40));
      redirectURL += '?' + params.toString();
      // console.log('redirectURL', redirectURL);
      goto_link(redirectURL);
    } else {
      // state format "randomstring-qrcode" and we will know use qr code or not
      var state = randomstring(40) + '-' + 'qrcode';
      params.set('state', state);
      redirectURL += '?' + params.toString();
      // console.log('redirectURL', redirectURL);
      showQrcodeWithLink(data_title, redirectURL, state);
    }
  });

  $('#select').on('change', function () {
    var url = $(this).val();
    if (url) {
      window.location.href = url;
    }
  });

  $('input[name=phone]').on('input', function (e) {
    var phone = $(this)
      .val()
      .replace(/[^0-9]/g, '');
    $(this).val(phone);
    if (phone && phone != '') {
      $('.block-pnv').addClass('block-active');
    } else {
      $('.block-pnv').removeClass('block-active');
    }
  });

  $('input[name=phone_kyc]').on('input', function (e) {
    var phone = $(this)
      .val()
      .replace(/[^0-9]/g, '');
    $(this).val(phone);
    if (phone && phone != '') {
      $('.block-identity').addClass('block-active');
    } else {
      $('.block-identity').removeClass('block-active');
    }
  });

  if ($('#response_info').length > 0) {
    $('#response_info').modal('show');
  }

  $('#btnQrCode').on('click', function () {
    $('#qrcode').modal('show');
  });

  if ($('#error_alert').length > 0) {
    $('#error_alert').modal('show');
  }
  let hash = window.location.hash;
  const item = localStorage.getItem('selector');

  if (hash) {
    localStorage.clear();
    window.location.href = hash;
    select_nav(hash.substring(1));
  } else if (!item) {
    location.hash = '#pnv';
  } else {
    window.location.href = '#' + item;
    select_nav(item);
  }
});

// console.log('window.hash', window.location.hash);

function select_nav(selector) {
  $('.phoneNumber').val('');
  $('.block-button').removeClass('block-active');
  $('.nav-link').removeClass('active');
  $('.nav-link-' + selector).addClass('active');
  $('.block').removeClass('active');
  $('.block-' + selector).addClass('active');
  localStorage.setItem('selector', selector);
}

$('#help').click(() => {
  const desktop = $(window).width() >= 576;
  if (desktop) {
    window.open(
      'https://www.ipification.com/media/IPification%20-%20Showcase%20Guide%202.2.pdf',
      'wwww',
      'width=' +
        parseInt(window.innerWidth) * 0.37 +
        ',height=' +
        parseInt(window.innerHeight) * 1 +
        'left=0,top=0',
    );
  } else {
    let newUrl = 'https://www.ipification.com/media/IPification%20-%20Showcase%20Guide%202.2.pdf';
    $('#help').attr('href', newUrl);
    $('#help').attr('target', '_blank');
  }
});

function showQrcodeWithLink(title, url, state) {
  // add event listener when scan qr code successful
  start_session_listener(state);

  Swal.fire({
    title: title,
    html: "<div class='qr-code-block'><div class='qrcode-title'>Scan QR code with your phone</div><div class='qrcode-img'></div></div>",
    showConfirmButton: false,
    showCloseButton: true,
    heightAuto: false,
    didOpen: () => {
      var qrCodeElm = document.querySelector('.qr-code-block .qrcode-img');
      new QRCode(qrCodeElm, {
        text: url,
        width: 212,
        height: 212,
        correctLevel: QRCode.CorrectLevel.L,
      });
      qrCodeElm.setAttribute('title', '');
    },
  });
}
