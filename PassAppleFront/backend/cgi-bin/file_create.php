<?php
header('Content-Type: application/json; charset=utf-8');

$scriptDir = __DIR__;
$outputDir = $scriptDir . '/line_before';

if (!is_dir($outputDir)) {
    mkdir($outputDir, 0777, true);
}

$rawBody = file_get_contents('php://input');
if ($rawBody === false || trim($rawBody) === '') {
    echo json_encode(['status' => 'error', 'message' => 'No request body']);
    exit;
}

$data = json_decode($rawBody, true);
if (!is_array($data) || !isset($data['image'])) {
    echo json_encode(['status' => 'error', 'message' => 'No image data']);
    exit;
}

$imageData = $data['image'];
$parts = explode(',', $imageData, 2);
if (count($parts) !== 2) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid image data']);
    exit;
}

$encoded = $parts[1];
$imageBytes = base64_decode($encoded, true);
if ($imageBytes === false) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid base64 data']);
    exit;
}

$timestamp = date('YmdHis');
$fileName = 'line-' . $timestamp . '.png';
$filePath = $outputDir . '/' . $fileName;

$result = file_put_contents($filePath, $imageBytes);
if ($result === false) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to save image']);
    exit;
}

echo json_encode([
    'status' => 'success',
    'message' => 'Saved image',
    'path' => $filePath,
    'filename' => $fileName,
]);
