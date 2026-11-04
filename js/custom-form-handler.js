/*
 * Собственный обработчик отправки форм (замена форм Tilda).
 * Перехватывает submit всех форм с классом t-form на этапе capture,
 * поэтому собственный обработчик Tilda (tilda-forms-1.0.min.js) этот submit
 * уже не получает — события одного типа, зарегистрированные на document
 * с capture:true, всегда срабатывают раньше обработчиков, навешанных
 * непосредственно на форму. Внешний вид форм и блока "спасибо" не меняется —
 * используются существующие классы и атрибуты Tilda (.t-form__successbox,
 * .t-form__inputsbox, data-success-message и т.д.).
 *
 * Отправка идёт через Formspree (GitHub Pages не исполняет PHP, поэтому
 * собственный mail.php использовать нельзя).
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://formspree.io/f/xkjjkvpe';
  var HONEYPOT_FIELD = 'company';

  function toArray(nodeList) {
    return Array.prototype.slice.call(nodeList);
  }

  function getErrorBoxes(form) {
    return toArray(form.querySelectorAll('.js-errorbox-all'));
  }

  function showFormError(form, message) {
    getErrorBoxes(form).forEach(function (box) {
      var item = box.querySelector('.js-rule-error-all') || box.querySelector('li');
      if (item) {
        item.textContent = message;
      }
      box.style.display = 'block';
    });
  }

  function hideFormErrors(form) {
    getErrorBoxes(form).forEach(function (box) {
      box.style.display = 'none';
    });
  }

  function showSuccess(form) {
    var inputsBox = form.querySelector('.t-form__inputsbox');
    var submitBox = form.querySelector('.t-form__submit');
    var successBox = form.querySelector('.js-successbox');

    if (inputsBox) inputsBox.style.display = 'none';
    if (submitBox) submitBox.style.display = 'none';

    if (successBox) {
      var message = successBox.getAttribute('data-success-message') || 'Спасибо, заявка отправлена!';
      successBox.textContent = message;
      successBox.style.display = 'block';
    }
  }

  function validateRequiredFields(form) {
    var requiredFields = toArray(form.querySelectorAll('[data-tilda-req="1"]'));
    for (var i = 0; i < requiredFields.length; i++) {
      var value = (requiredFields[i].value || '').trim();
      if (!value) {
        return false;
      }
    }
    return true;
  }

  function setSubmitting(form, isSubmitting) {
    var btn = form.querySelector('.t-submit');
    if (btn) {
      btn.disabled = isSubmitting;
    }
  }

  function handleSubmit(form) {
    hideFormErrors(form);

    if (!validateRequiredFields(form)) {
      showFormError(form, 'Пожалуйста, заполните обязательные поля.');
      return;
    }

    // Honeypot: если скрытое поле заполнено - это бот. Отвечаем "успехом",
    // чтобы бот не подстраивался, но на Formspree ничего не отправляем.
    var honeypot = form.querySelector('[name="' + HONEYPOT_FIELD + '"]');
    if (honeypot && honeypot.value) {
      showSuccess(form);
      return;
    }

    var formData = new FormData(form);
    formData.append('page_url', window.location.href);
    formData.append('_subject', 'Заявка с сайта reabilitatsia.ru');

    setSubmitting(form, true);

    fetch(ENDPOINT, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    })
      .then(function (response) {
        return response.json().catch(function () {
          return {};
        }).then(function (json) {
          return { ok: response.ok, json: json };
        });
      })
      .then(function (result) {
        setSubmitting(form, false);
        if (result.ok) {
          showSuccess(form);
        } else {
          var message = 'Не удалось отправить заявку. Попробуйте позже или позвоните нам.';
          if (result.json && Array.isArray(result.json.errors) && result.json.errors.length) {
            message = result.json.errors.map(function (e) { return e.message; }).join(', ');
          } else if (result.json && result.json.error) {
            message = result.json.error;
          }
          showFormError(form, message);
        }
      })
      .catch(function () {
        setSubmitting(form, false);
        showFormError(form, 'Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.');
      });
  }

  document.addEventListener(
    'submit',
    function (event) {
      var form = event.target;
      if (!form || !form.classList || !form.classList.contains('t-form')) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      handleSubmit(form);
    },
    true
  );
})();
