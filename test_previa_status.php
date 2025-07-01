<?php
// ARQUIVO: test_previa_status.php
// Script para testar se os dados de parecer estão sendo salvos e recuperados corretamente

header("Content-Type: application/json; charset=UTF-8");

try {
    include_once("config.php");
    
    if (!isset($conn_pacientes) || $conn_pacientes->connect_error) {
        throw new Exception("Erro na conexão com o banco de dados");
    }

    // Buscar uma prévia recente para teste
    $sql = "SELECT id, parecer_registros, parecer_guia, finalizacao, titulo_atendimento 
            FROM previas 
            WHERE parecer_registros IS NOT NULL 
            ORDER BY data_criacao DESC 
            LIMIT 1";
    
    $result = $conn_pacientes->query($sql);
    
    if ($result->num_rows === 0) {
        echo json_encode([
            "status" => "info",
            "message" => "Nenhuma prévia com registros encontrada"
        ]);
        exit;
    }
    
    $previa = $result->fetch_assoc();
    
    // Processar registros de parecer
    $registrosProcessados = [];
    
    if (!empty($previa['parecer_registros'])) {
        $registrosFromJSON = json_decode($previa['parecer_registros'], true);
        
        if (json_last_error() === JSON_ERROR_NONE && is_array($registrosFromJSON)) {
            foreach ($registrosFromJSON as $registro) {
                $registrosProcessados[] = [
                    'id' => $registro['id'] ?? 'N/A',
                    'parecerGuia' => $registro['parecerGuia'] ?? $registro['parecer_guia'] ?? '',
                    'finalizacao' => $registro['finalizacao'] ?? '',
                    'parecer' => substr($registro['parecer'] ?? '', 0, 50) . '...',
                    'usuario_criacao' => $registro['usuario_criacao'] ?? 'N/A',
                    'usuario_alteracao' => $registro['usuario_alteracao'] ?? 'N/A'
                ];
            }
        }
    }
    
    echo json_encode([
        "status" => "success",
        "previa_id" => $previa['id'],
        "titulo_atendimento" => $previa['titulo_atendimento'],
        "campos_antigos" => [
            "parecer_guia" => $previa['parecer_guia'],
            "finalizacao" => $previa['finalizacao']
        ],
        "parecer_registros_raw" => $previa['parecer_registros'],
        "registros_processados" => $registrosProcessados,
        "json_error" => json_last_error_msg(),
        "test_info" => [
            "message" => "Dados recuperados com sucesso",
            "registros_count" => count($registrosProcessados),
            "has_status_data" => !empty($registrosProcessados) && 
                               (!empty($registrosProcessados[0]['parecerGuia']) || 
                                !empty($registrosProcessados[0]['finalizacao']))
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage(),
        "file" => __FILE__,
        "line" => $e->getLine()
    ], JSON_PRETTY_PRINT);
}

if (isset($conn_pacientes)) {
    $conn_pacientes->close();
}
?> 