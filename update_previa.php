<?php
// ARQUIVO: api/Previas/update_previa.php
// Versão melhorada com suporte aos novos campos de data E titulo_atendimento

// Desabilitar relatórios de erro para evitar HTML no JSON
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    include_once("../../config.php");
    
    // Verificar a conexão com o banco de dados
    if ($conn_pacientes->connect_error) {
        http_response_code(500);
        echo json_encode(["error" => "Falha na conexão com o banco de dados: " . $conn_pacientes->connect_error]);
        exit;
    }
    
    // Iniciar transação
    $conn_pacientes->begin_transaction();
    
    // Obter dados do corpo da requisição
    $rawInput = file_get_contents("php://input");
    $data = json_decode($rawInput, true);
    
    // LOG PARA DEBUG
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Erro ao decodificar JSON: " . json_last_error_msg() . " | Input: " . substr($rawInput, 0, 500));
    }
    
    if (!$data || !isset($data['id'])) {
        throw new Exception("Dados inválidos ou ID da prévia não fornecido | Input recebido: " . substr($rawInput, 0, 500));
    }
    
    // Verificar se o ID do usuário foi fornecido
    if (!isset($data['usuario_alteracao_id'])) {
        throw new Exception("ID do usuário que está alterando não fornecido");
    }

    // PROCESSAR E VALIDAR O TÍTULO DO ATENDIMENTO
    $tituloAtendimento = null;
    if (isset($data['titulo_atendimento']) && !empty(trim($data['titulo_atendimento']))) {
        // Limitar a 100 caracteres conforme definição do banco
        $tituloAtendimento = substr(trim($data['titulo_atendimento']), 0, 100);
    }

    // PROCESSAR E VALIDAR MÚLTIPLOS REGISTROS DE PARECER (MÁXIMO 5)
    $parecerRegistrosJSON = null;
    $registrosValidos = [];
    
    if (isset($data['parecer_registros']) && is_array($data['parecer_registros'])) {
        // VALIDAR LIMITE MÁXIMO
        if (count($data['parecer_registros']) > 5) {
            throw new Exception("Limite máximo de 5 registros de parecer excedido. Foram enviados " . count($data['parecer_registros']) . " registros.");
        }
        
        // Limpar registros vazios e validar
        foreach ($data['parecer_registros'] as $index => $registro) {
            // Validar se o registro tem pelo menos um campo preenchido
            if (!empty($registro['parecer']) || !empty($registro['parecerGuia']) || !empty($registro['finalizacao'])) {
                // Validar campos obrigatórios e formatos
                $registroLimpo = [
                    'id' => $registro['id'] ?? ($index + 1),
                    'parecer' => isset($registro['parecer']) ? substr(trim($registro['parecer']), 0, 1000) : '',
                    'parecerGuia' => '',
                    'finalizacao' => '',
                    'dataSolicitacao' => '', // NOVO CAMPO
                    'dataParecer' => '',
                    'tempoAnalise' => null,
                    'observacoes' => isset($registro['observacoes']) ? substr(trim($registro['observacoes']), 0, 500) : ''
                ];
                
                // NOVO: Validar dataSolicitacao
                if (!empty($registro['dataSolicitacao']) && preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $registro['dataSolicitacao'])) {
                    $registroLimpo['dataSolicitacao'] = $registro['dataSolicitacao'];
                } else if (!empty($data['data_solicitacao'])) {
                    // Se não há data específica no registro, usar a data geral da prévia
                    $registroLimpo['dataSolicitacao'] = $data['data_solicitacao'];
                }
                
                // Validar parecerGuia
                if (!empty($registro['parecerGuia']) && 
                    in_array($registro['parecerGuia'], ['Favorável', 'Favorável com Inconsistência', 'Inconclusivo', 'Desfavorável'])) {
                    $registroLimpo['parecerGuia'] = $registro['parecerGuia'];
                }
                
                // Validar finalizacao
                if (!empty($registro['finalizacao']) && 
                    in_array($registro['finalizacao'], ['Favorável', 'Favorável com Inconsistência', 'Inconclusivo', 'Desfavorável'])) {
                    $registroLimpo['finalizacao'] = $registro['finalizacao'];
                }
                
                // Validar data do parecer (formato DD/MM/YYYY)
                if (!empty($registro['dataParecer']) && preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $registro['dataParecer'])) {
                    $registroLimpo['dataParecer'] = $registro['dataParecer'];
                }
                
                // Validar tempo de análise
                if (isset($registro['tempoAnalise']) && is_numeric($registro['tempoAnalise']) && $registro['tempoAnalise'] >= 0) {
                    $registroLimpo['tempoAnalise'] = intval($registro['tempoAnalise']);
                }
                
                $registrosValidos[] = $registroLimpo;
            }
        }
        
        // Se há registros válidos, converter para JSON
        if (!empty($registrosValidos)) {
            $parecerRegistrosJSON = json_encode($registrosValidos, JSON_UNESCAPED_UNICODE);
            
            // Verificar se JSON foi criado corretamente
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Erro ao processar registros de parecer: " . json_last_error_msg());
            }
        }
    }

    // Processar dados para compatibilidade com campos existentes
    // (usar primeiro registro válido nos campos antigos para compatibilidade)
    $primeiroRegistro = null;
    if (!empty($registrosValidos)) {
        $primeiroRegistro = $registrosValidos[0];
    }
    
    // Preparar a atualização da prévia com o campo parecer_registros E titulo_atendimento
    $sql = "UPDATE previas SET
        titulo_atendimento = ?,
        guia = ?, 
        protocolo = ?, 
        cid = ?,
        ciclos_previstos = ?,
        data_emissao_guia = ?,
        data_encaminhamento_af = ?,
        data_solicitacao = ?, 
        parecer = ?,
        comentario = ?,
        peso = ?, 
        altura = ?, 
        parecer_guia = ?, 
        finalizacao = ?,
        inconsistencia = ?, 
        data_parecer_registrado = ?, 
        tempo_analise = ?,
        parecer_registros = ?,
        usuario_alteracao_id = ?,
        data_atualizacao = NOW()
    WHERE id = ?";
    
    $stmt = $conn_pacientes->prepare($sql);
    
    if (!$stmt) {
        throw new Exception("Erro ao preparar query: " . $conn_pacientes->error);
    }
    
    // Função helper para converter data DD/MM/YYYY para YYYY-MM-DD
    function convertDateToMysql($dateString) {
        if (!$dateString || empty($dateString)) {
            return NULL;
        }
        $dateParts = explode('/', $dateString);
        if (count($dateParts) === 3) {
            return $dateParts[2] . '-' . $dateParts[1] . '-' . $dateParts[0];
        }
        return NULL;
    }
    
    // Converter as datas para formato MySQL
    $dataEmissaoGuia = convertDateToMysql($data['data_emissao_guia'] ?? '');
    $dataEncaminhamentoAF = convertDateToMysql($data['data_encaminhamento_af'] ?? '');
    
    // CORREÇÃO: Garantir que data_solicitacao sempre tenha um valor (campo obrigatório)
    $dataSolicitacao = convertDateToMysql($data['data_solicitacao'] ?? '');
    if (!$dataSolicitacao) {
        // Se não foi fornecida, usar a data atual
        $dataSolicitacao = date('Y-m-d');
    }
    
    $dataParecerRegistrado = $primeiroRegistro ? convertDateToMysql($primeiroRegistro['dataParecer']) : convertDateToMysql($data['data_parecer_registrado'] ?? '');

    // Processar ciclos_previstos (pode ser null)
    $ciclosPrevistos = null;
    if (isset($data['ciclos_previstos']) && !empty($data['ciclos_previstos'])) {
        $ciclosPrevistos = intval($data['ciclos_previstos']);
    }

    // Usar dados do primeiro registro para campos de compatibilidade
    $parecerCompat = $primeiroRegistro['parecer'] ?? ($data['parecer'] ?? '');
    $parecerGuiaCompat = null;
    $finalizacaoCompat = null;
    $tempoAnaliseCompat = null;

    if ($primeiroRegistro) {
        if (!empty($primeiroRegistro['parecerGuia'])) {
            $parecerGuiaCompat = $primeiroRegistro['parecerGuia'];
        }
        if (!empty($primeiroRegistro['finalizacao'])) {
            $finalizacaoCompat = $primeiroRegistro['finalizacao'];
        }
        $tempoAnaliseCompat = $primeiroRegistro['tempoAnalise'];
    } else {
        // Fallback para campos antigos se não há registros múltiplos
        if (isset($data['parecer_guia']) && !empty($data['parecer_guia']) && 
            in_array($data['parecer_guia'], ['Favorável', 'Favorável com Inconsistência', 'Inconclusivo', 'Desfavorável'])) {
            $parecerGuiaCompat = $data['parecer_guia'];
        }
        if (isset($data['finalizacao']) && !empty($data['finalizacao']) && 
            in_array($data['finalizacao'], ['Favorável', 'Favorável com Inconsistência', 'Inconclusivo', 'Desfavorável'])) {
            $finalizacaoCompat = $data['finalizacao'];
        }
        $tempoAnaliseCompat = $data['tempo_analise'] ?? null;
    }
    
    // Garantir que campos opcionais tenham valores padrão
    $comentario = $data['comentario'] ?? '';
    $peso = isset($data['peso']) && $data['peso'] !== '' ? floatval($data['peso']) : null;
    $altura = isset($data['altura']) && $data['altura'] !== '' ? floatval($data['altura']) : null;
    
    // Validação para inconsistencia
    $inconsistencia = NULL;
    if (isset($data['inconsistencia']) && !empty($data['inconsistencia'])) {
        if (in_array($data['inconsistencia'], ['Completa', 'Dados Faltantes', 'Requer Análise', 'Informações Inconsistentes'])) {
            $inconsistencia = $data['inconsistencia'];
        }
    }
    
    // BIND dos parâmetros incluindo titulo_atendimento e parecer_registros
    $stmt->bind_param(
        "sssssissssddssssisii",
        $tituloAtendimento,            // s - 1 (titulo_atendimento)
        $data['guia'],                 // s - 2
        $data['protocolo'],            // s - 3
        $data['cid'],                  // s - 4
        $ciclosPrevistos,              // i - 5
        $dataEmissaoGuia,              // s - 6
        $dataEncaminhamentoAF,         // s - 7
        $dataSolicitacao,              // s - 8
        $parecerCompat,                // s - 9
        $comentario,                   // s - 10
        $peso,                         // d - 11
        $altura,                       // d - 12
        $parecerGuiaCompat,            // s - 13
        $finalizacaoCompat,            // s - 14
        $inconsistencia,               // s - 15
        $dataParecerRegistrado,        // s - 16
        $tempoAnaliseCompat,           // i - 17
        $parecerRegistrosJSON,         // s - 18
        $data['usuario_alteracao_id'], // i - 19
        $data['id']                    // i - 20
    );
    
    if (!$stmt->execute()) {
        throw new Exception("Erro ao executar query de atualização: " . $stmt->error);
    }
    
    // Atualizar ciclos/dias (mantido igual)
    if (isset($data['ciclos_dias']) && is_array($data['ciclos_dias'])) {
        // Primeiro, excluir os ciclos existentes
        $deleteQuery = "DELETE FROM previa_ciclos_dias WHERE previa_id = ?";
        $deleteStmt = $conn_pacientes->prepare($deleteQuery);
        $deleteStmt->bind_param("i", $data['id']);
        $deleteStmt->execute();
        
        // Depois, inserir os novos
        $cicloSql = "INSERT INTO previa_ciclos_dias (
            previa_id, 
            ciclo, 
            dia, 
            protocolo, 
            is_full_cycle
        ) VALUES (?, ?, ?, ?, ?)";
        
        $cicloStmt = $conn_pacientes->prepare($cicloSql);
        
        foreach ($data['ciclos_dias'] as $cicloDia) {
            $isFullCycle = isset($cicloDia['fullCycle']) ? (int)$cicloDia['fullCycle'] : 0;
            
            $cicloStmt->bind_param(
                "isssi",
                $data['id'],
                $cicloDia['ciclo'],
                $cicloDia['dia'],
                $cicloDia['protocolo'],
                $isFullCycle
            );
            
            $cicloStmt->execute();
        }
    }
    
    // Commit da transação
    $conn_pacientes->commit();
    
    http_response_code(200);
    echo json_encode([
        "message" => "Prévia atualizada com sucesso",
        "id" => $data['id'],
        "titulo_atendimento" => $tituloAtendimento,
        "parecer_registros_count" => count($registrosValidos),
        "parecer_registros_limit" => 5,
        "data_compatibility" => [
            "parecer_primary" => $parecerCompat,
            "parecer_guia_primary" => $parecerGuiaCompat,
            "finalizacao_primary" => $finalizacaoCompat
        ],
        "enhanced_features" => [
            "titulo_atendimento_support" => true,
            "data_solicitacao_support" => true,
            "auto_date_calculation" => true,
            "improved_time_analysis" => true
        ]
    ]);
    
} catch (Exception $e) {
    // Rollback em caso de erro
    if (isset($conn_pacientes) && !$conn_pacientes->connect_error) {
        $conn_pacientes->rollback();
    }
    
    http_response_code(500);
    echo json_encode([
        "error" => "Erro detalhado: " . $e->getMessage(),
        "file" => $e->getFile(),
        "line" => $e->getLine(),
        "debug_info" => [
            "request_method" => $_SERVER['REQUEST_METHOD'] ?? 'N/A',
            "content_type" => $_SERVER['CONTENT_TYPE'] ?? 'N/A',
            "raw_input_length" => isset($rawInput) ? strlen($rawInput) : 0,
            "data_keys" => isset($data) ? array_keys($data) : []
        ]
    ]);
}

if (isset($conn_pacientes)) {
    $conn_pacientes->close();
}
?> 