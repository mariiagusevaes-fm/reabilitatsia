<?php
/**
 * Собственный обработчик заявок с форм сайта (замена форм Tilda).
 * Хостинг: Beget. Принимает POST, проверяет поля и honeypot,
 * отправляет письмо на MAIL_TO с адреса на домене сайта.
 */

declare(strict_types=1);

const MAIL_TO     = 'kormilica24@mail.ru';
const MAIL_FROM   = 'noreply@reabilitatsia.ru';
const SITE_NAME   = 'reabilitatsia.ru';
const SITE_HOST   = 'reabilitatsia.ru';
const HONEYPOT    = 'company'; // скрытое поле-ловушка, настоящие посетители его не видят и не заполняют

$isAjax = (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest');

function respond(bool $ok, string $message, int $code, bool $isAjax): void
{
    if ($isAjax) {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['status' => $ok ? 'ok' : 'error', 'message' => $message], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Резервный вариант на случай, если JavaScript на странице не выполнился:
    // форма всё равно отправляется обычным POST-ом на этот же адрес.
    $redirectTo = $_SERVER['HTTP_REFERER'] ?? '/';
    $separator  = (strpos($redirectTo, '?') === false) ? '?' : '&';
    header('Location: ' . $redirectTo . $separator . ($ok ? 'sent=1' : 'sent=0'));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Недопустимый метод запроса.', 405, $isAjax);
}

// Мягкая проверка источника запроса (не отклоняет, если заголовок отсутствует,
// но отбрасывает явно посторонние источники).
$referer = $_SERVER['HTTP_REFERER'] ?? '';
if ($referer !== '' && stripos($referer, SITE_HOST) === false) {
    respond(false, 'Некорректный источник запроса.', 403, $isAjax);
}

// Honeypot: если скрытое поле заполнено — это бот.
// Отвечаем "успехом", чтобы бот не подстраивался, но письмо не отправляем.
if (!empty($_POST[HONEYPOT])) {
    respond(true, 'Заявка отправлена', 200, $isAjax);
}

/**
 * Очищает пользовательский ввод: убирает теги и переносы строк,
 * обрезает пробелы и ограничивает длину.
 */
function clean_field($value, int $maxLength): string
{
    $value = is_string($value) ? $value : '';
    $value = strip_tags($value);
    $value = preg_replace('/[\r\n]+/u', ' ', $value) ?? $value;
    $value = trim($value);
    if (mb_strlen($value) > $maxLength) {
        $value = mb_substr($value, 0, $maxLength);
    }
    return $value;
}

$name  = clean_field($_POST['Name'] ?? '', 150);
$phone = clean_field($_POST['Phone'] ?? '', 30);
$input = clean_field($_POST['Input'] ?? '', 2000);
$pageUrl = clean_field($_POST['page_url'] ?? '', 300);

$phoneDigits = preg_replace('/\D+/', '', $phone) ?? '';

// Если телефон указан — проверяем, что это похоже на настоящий номер.
if ($phone !== '' && (strlen($phoneDigits) < 10 || strlen($phoneDigits) > 15)) {
    respond(false, 'Проверьте номер телефона.', 422, $isAjax);
}

// Хотя бы одно поле должно быть заполнено (пустые заявки отбрасываем).
if ($name === '' && $phone === '' && $input === '') {
    respond(false, 'Заполните хотя бы одно поле формы.', 422, $isAjax);
}

$lines = [];
$lines[] = 'Новая заявка с сайта ' . SITE_NAME;
$lines[] = '';
if ($name !== '') {
    $lines[] = 'Имя: ' . $name;
}
if ($phone !== '') {
    $lines[] = 'Телефон: ' . $phone;
}
if ($input !== '') {
    $lines[] = 'Сообщение: ' . $input;
}
$lines[] = '';
if ($pageUrl !== '') {
    $lines[] = 'Страница: ' . $pageUrl;
}
$lines[] = 'Дата: ' . date('d.m.Y H:i:s');
if (!empty($_SERVER['REMOTE_ADDR'])) {
    $lines[] = 'IP: ' . $_SERVER['REMOTE_ADDR'];
}

$body    = implode("\n", $lines);
$subject = '=?UTF-8?B?' . base64_encode('Заявка с сайта ' . SITE_NAME) . '?=';

$headers = [
    'From: ' . SITE_NAME . ' <' . MAIL_FROM . '>',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

$sent = mail(MAIL_TO, $subject, $body, implode("\r\n", $headers));

if (!$sent) {
    respond(false, 'Не удалось отправить заявку. Попробуйте позже или позвоните нам.', 500, $isAjax);
}

respond(true, 'Заявка отправлена', 200, $isAjax);
