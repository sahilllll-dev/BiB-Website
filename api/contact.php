<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

const BIB_CONTACT_DOMAIN = 'busynessintobrands.com';
const BIB_CONTACT_EMAIL = 'hello@busynessintobrands.com';

function respond(int $statusCode, bool $ok, string $message): void
{
    http_response_code($statusCode);

    echo json_encode([
        'ok' => $ok,
        'message' => $message,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    exit;
}

function field(string $key, int $maxLength = 1000): string
{
    $value = $_POST[$key] ?? '';

    if (is_array($value)) {
        return '';
    }

    $value = trim((string)$value);
    $value = str_replace(["\r\n", "\r"], "\n", $value);

    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';

    if (strlen($value) > $maxLength) {
        $value = substr($value, 0, $maxLength);
    }

    return $value;
}

function singleLine(string $value): string
{
    return trim(preg_replace('/\s+/u', ' ', $value) ?? '');
}

function bodyValue(string $value): string
{
    return $value !== '' ? $value : 'Not provided';
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, false, 'Method not allowed.');
}

$name = field('name', 120);
$email = field('email', 180);
$brand = field('brand', 180);
$industry = field('industry', 120);
$problem = field('problem', 1500);
$source = field('source', 180);

if (
    $name === '' ||
    $email === '' ||
    $brand === '' ||
    $industry === ''
) {
    respond(422, false, 'Please fill all required fields.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, false, 'Please enter a valid email address.');
}

$allowedIndustries = [
    'Food/FMCG',
    'Real Estate',
    'Manufacturing',
    'Political',
    'D2C/E-commerce',
    'Hospitality',
    'Fashion',
    'Other',
];

if (!in_array($industry, $allowedIndustries, true)) {
    respond(422, false, 'Please select a valid industry.');
}

$subject = 'New BiB enquiry from ' . singleLine($brand);
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$submittedAt = gmdate('Y-m-d H:i:s') . ' UTC';

$message = implode("\n", [
    'New BiB website enquiry',
    '',
    'Name: ' . $name,
    'Email: ' . $email,
    'Brand / Company: ' . $brand,
    'Industry: ' . $industry,
    '',
    'What is not working:',
    bodyValue($problem),
    '',
    'How did they find us:',
    bodyValue($source),
    '',
    'Submitted: ' . $submittedAt,
    'Website: https://' . BIB_CONTACT_DOMAIN . '/',
]);

$headers = [];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'Content-Transfer-Encoding: 8bit';
$headers[] = 'From: BiB Website <' . BIB_CONTACT_EMAIL . '>';
$headers[] = 'Reply-To: ' . $email;
$headers[] = 'X-Mailer: PHP/' . phpversion();

$sent = @mail(
    BIB_CONTACT_EMAIL,
    $encodedSubject,
    $message,
    implode("\r\n", $headers)
);

if (!$sent) {
    respond(
        500,
        false,
        'Message could not be sent.'
    );
}

respond(200, true, 'Message sent successfully.');
