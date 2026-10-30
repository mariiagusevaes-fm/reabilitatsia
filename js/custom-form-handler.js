/*
 * Собственный обработчик отправки форм (замена форм Tilda).
 * Перехватывает submit всех форм с классом t-form на этапе capture,
 * поэтому собственный обработчик Tilda (tilda-forms-1.0.min.js) этот submit
 * уже не получает — события одного типа, зарегистрированные на document
 * с capture:true, всегда срабатывают раньше обработчиков, навешанных
 * непосредственно на форму. Внешний вид форм и блока "спасибо" не меняется —
 * используются существующие классы и атрибуты Tilda (.t-form__successbox,
 * .t-form__inputsbox, data-success-message и т.д.).
 */
(function () {
  'use strict';

  var ENDPOINT = 'mail.php';

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

    var formData = new FormData(form);
    formData.append('page_url', window.location.href);

    setSubmitting(form, true);

    fetch(ENDPOINT, {
      method: 'POST',
      body: formData,
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
      .then(function (response) {
        return response.json().catch(function () {
          return { status: 'error', message: 'Сервер вернул непонятный ответ.' };
        });
      })
      .then(function (json) {
        setSubmitting(form, false);
        if (json && json.status === 'ok') {
          showSuccess(form);
        } else {
          showFormError(form, (json && json.message) || 'Не удалось отправить заявку. Попробуйте позже или позвоните нам.');
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
