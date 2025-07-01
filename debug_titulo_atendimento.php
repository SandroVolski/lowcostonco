<?php
// ARQUIVO: api/Previas/debug_titulo_atendimento.php
// Arquivo de debug para verificar se o campo titulo_atendimento existe

// Desabilitar relatórios de erro para evitar HTML no JSON
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

try {
    include_once("../../config.php");
    
    // Verificar conexão
    if ($conn_pacientes->connect_error) {
        throw new Exception("Falha na conexão: " . $conn_pacientes->connect_error);
    }
    
    // Verificar se a tabela previas existe e tem o campo titulo_atendimento
    $sql = "DESCRIBE previas";
    $result = $conn_pacientes->query($sql);
    
    $campos = [];
    $temTituloAtendimento = false;
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $campos[] = $row['Field'];
            if ($row['Field'] === 'titulo_atendimento') {
                $temTituloAtendimento = true;
            }
        }
    }
    
    // Teste simples de inserção
    $testeInserir = false;
    $erroInsercao = null;
    
    try {
        // Tentar inserir um registro de teste
        $sqlTest = "INSERT INTO previas (
            paciente_id, 
            numero_sequencial, 
            codigo_composto, 
            titulo_atendimento,
            guia, 
            protocolo, 
            cid,
            data_solicitacao,
            usuario_criacao_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn_pacientes->prepare($sqlTest);
        if ($stmt) {
            $pacienteIdTeste = 999999;
            $numeroSeq = 999;
            $codigoComp = "999999-999";
            $tituloTeste = "TESTE DEBUG";
            $guiaTeste = "TEST123";
            $protocoloTeste = "PROTOCOLO TESTE";
            $cidTeste = "C78.00";
            $dataSolicitacaoTeste = date('Y-m-d'); // CORREÇÃO: Incluir data_solicitacao
            $usuarioTeste = 1;
            
            $stmt->bind_param("iissssssi", 
                $pacienteIdTeste, 
                $numeroSeq, 
                $codigoComp, 
                $tituloTeste, 
                $guiaTeste, 
                $protocoloTeste, 
                $cidTeste, 
                $dataSolicitacaoTeste,
                $usuarioTeste
            );
            
            if ($stmt->execute()) {
                $testeInserir = true;
                $idInserido = $conn_pacientes->insert_id;
                
                // Remover o registro de teste
                $sqlDelete = "DELETE FROM previas WHERE id = ?";
                $stmtDelete = $conn_pacientes->prepare($sqlDelete);
                $stmtDelete->bind_param("i", $idInserido);
                $stmtDelete->execute();
            } else {
                $erroInsercao = $stmt->error;
            }
        } else {
            $erroInsercao = $conn_pacientes->error;
        }
    } catch (Exception $e) {
        $erroInsercao = $e->getMessage();
    }
    
    echo json_encode([
        "success" => true,
        "database_connection" => "OK",
        "table_exists" => count($campos) > 0,
        "titulo_atendimento_field_exists" => $temTituloAtendimento,
        "total_fields" => count($campos),
        "all_fields" => $campos,
        "test_insert" => [
            "success" => $testeInserir,
            "error" => $erroInsercao
        ],
        "debug_info" => [
            "php_version" => PHP_VERSION,
            "mysql_version" => $conn_pacientes->server_info ?? "N/A",
            "charset" => $conn_pacientes->character_set_name() ?? "N/A"
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage(),
        "file" => __FILE__,
        "line" => __LINE__
    ], JSON_PRETTY_PRINT);
}

if (isset($conn_pacientes)) {
    $conn_pacientes->close();
}
?> 