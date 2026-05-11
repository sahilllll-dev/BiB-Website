<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

const BIB_CONTACT_EMAIL = 'hello@busyinessintobrand.com';

function respond(int $statusCode, bool $ok, string $message): void
{
    http_response_code($statusCode);
    echo json_encode([
        'ok' => $ok,
        'message' => $message,
    ]);
    exit;
}

function field(string $key, int $maxLength = 800): string
{
    $value = $_POST[$key] ?? '';

    if (is_array($value)) {
        $value = '';
    }

    $value = trim((string) $value);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value) ?? '';

    if (strlen($value) > $maxLength) {
        $value = substr($value, 0, $maxLength);
    }

    return $value;
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function tableRow(string $label, string $value): string
{
    $safeValue = $value !== '' ? nl2br(e($value)) : '<span style="color:#8a8f98;">Not provided</span>';

    return '
        <tr>
            <td style="padding:18px 0;border-bottom:1px solid #e6e0d4;width:36%;vertical-align:top;">
                <p style="margin:0;font:700 12px/1.2 Arial, sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#6f746f;">' . e($label) . '</p>
            </td>
            <td style="padding:18px 0;border-bottom:1px solid #e6e0d4;vertical-align:top;">
                <p style="margin:0;font:500 16px/1.55 Arial, sans-serif;color:#101319;">' . $safeValue . '</p>
            </td>
        </tr>';
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, false, 'Method not allowed.');
}

$name = field('name', 120);
$email = field('email', 180);
$brand = field('brand', 180);
$industry = field('industry', 120);
$problem = field('problem', 1200);
$source = field('source', 180);

if ($name === '' || $email === '' || $brand === '' || $industry === '') {
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

$submittedAt = gmdate('d M Y, H:i') . ' UTC';
$ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
$subjectBrand = preg_replace('/\s+/', ' ', $brand) ?? $brand;
$subject = 'New BiB enquiry from ' . $subjectBrand;

$html = '<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>' . e($subject) . '</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f0e7;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;">
      New BiB enquiry from ' . e($name) . ' at ' . e($brand) . '.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f4f0e7;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:720px;background:#ffffff;border:1px solid #e8e0d2;">
            <tr>
              <td style="padding:34px 34px 18px;background:#090b0f;">
                <p style="margin:0 0 16px;font:700 12px/1.2 Arial, sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#d9ff8a;">BiB website enquiry</p>
                <h1 style="margin:0;font:800 34px/1 Arial, sans-serif;letter-spacing:-.04em;color:#ffffff;">Tell us what is not working.</h1>
                <p style="margin:16px 0 0;font:400 16px/1.55 Arial, sans-serif;color:#c9ced6;">A new conversation has started from the website contact form.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 34px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  ' . tableRow('Name', $name) . '
                  ' . tableRow('Email', $email) . '
                  ' . tableRow('Brand / Company', $brand) . '
                  ' . tableRow('Industry', $industry) . '
                  ' . tableRow('What is not working?', $problem) . '
                  ' . tableRow('How did they find us?', $source) . '
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:24px;background:#faf8f2;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 6px;font:700 12px/1.2 Arial, sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#6f746f;">Submission details</p>
                      <p style="margin:0;font:400 14px/1.6 Arial, sans-serif;color:#4d535c;">Submitted: ' . e($submittedAt) . '<br>IP: ' . e($ipAddress) . '<br>User agent: ' . e($userAgent) . '</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>';

$plainText = implode("\n", [
    'New BiB website enquiry',
    '',
    'Name: ' . $name,
    'Email: ' . $email,
    'Brand / Company: ' . $brand,
    'Industry: ' . $industry,
    'What is not working?: ' . ($problem !== '' ? $problem : 'Not provided'),
    'How did they find us?: ' . ($source !== '' ? $source : 'Not provided'),
    '',
    'Submitted: ' . $submittedAt,
    'IP: ' . $ipAddress,
]);

$boundary = 'bib-contact-' . bin2hex(random_bytes(12));
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$replyName = str_replace(["\\", '"', "\r", "\n"], ['', "'", '', ''], $name);
$headers = [
    'MIME-Version: 1.0',
    'From: BiB Website <' . BIB_CONTACT_EMAIL . '>',
    'Reply-To: "' . $replyName . '" <' . $email . '>',
    'Return-Path: ' . BIB_CONTACT_EMAIL,
    'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
];

$body = "--{$boundary}\r\n"
    . "Content-Type: text/plain; charset=UTF-8\r\n"
    . "Content-Transfer-Encoding: 8bit\r\n\r\n"
    . $plainText . "\r\n\r\n"
    . "--{$boundary}\r\n"
    . "Content-Type: text/html; charset=UTF-8\r\n"
    . "Content-Transfer-Encoding: 8bit\r\n\r\n"
    . $html . "\r\n\r\n"
    . "--{$boundary}--";

$sent = @mail(
    BIB_CONTACT_EMAIL,
    $encodedSubject,
    $body,
    implode("\r\n", $headers),
    '-f ' . BIB_CONTACT_EMAIL
);

if (!$sent) {
    respond(500, false, 'The message could not be sent. Please email hello@busyinessintobrand.com directly.');
}

respond(200, true, 'Message sent.');
