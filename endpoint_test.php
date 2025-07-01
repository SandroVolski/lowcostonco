<?php
// ARQUIVO: api/Previas/endpoint_test.php
// Teste direto do endpoint usando cURL

// Desabilitar relatórios de erro para evitar HTML no JSON
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Dados de teste mínimos
$testData = [
    "paciente_id" => 1,
    "titulo_atendimento" => "Teste cURL",
    "guia" => "TEST123",
    "protocolo" => "PROTOCOLO TESTE",
    "cid" => "C78.00",
    "data_solicitacao" => date('d/m/Y'), // Data de hoje
    "usuario_criacao_id" => 1,
    "parecer_registros" => [
        [
            "id" => 1,
            "parecer" => "Teste",
            "parecerGuia" => "",
            "finalizacao" => "",
            "dataParecer" => "",
            "tempoAnalise" => null,
            "observacoes" => ""
        ]
    ],
    "ciclos_dias" => [
        [
            "ciclo" => "",
            "dia" => "",
            "protocolo" => ""
        ]
    ]
];

$url = "https://api.lowcostonco.com.br/backend-php/api/Previas/create_previa.php";

$curl = curl_init();

curl_setopt_array($curl, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => '',
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => 'POST',
    CURLOPT_POSTFIELDS => json_encode($testData),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json'
    ],
]);

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($curl, CURLINFO_CONTENT_TYPE);
$curlError = curl_error($curl);

curl_close($curl);

// Verificar se é JSON válido
$jsonDecoded = json_decode($response, true);
$isValidJson = json_last_error() === JSON_ERROR_NONE;

echo json_encode([
    "test_info" => [
        "url" => $url,
        "http_code" => $httpCode,
        "content_type" => $contentType,
        "curl_error" => $curlError ?: null,
        "response_length" => strlen($response),
        "is_valid_json" => $isValidJson,
        "json_error" => $isValidJson ? null : json_last_error_msg()
    ],
    "sent_data" => $testData,
    "raw_response" => $response,
    "parsed_response" => $isValidJson ? $jsonDecoded : null,
    "debug_details" => [
        "first_100_chars" => substr($response, 0, 100),
        "contains_html" => strpos($response, '<') !== false,
        "contains_php_error" => strpos($response, 'Fatal error') !== false || strpos($response, 'Warning') !== false
    ]
], JSON_PRETTY_PRINT);
?> 