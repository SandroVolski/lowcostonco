<?php
// ARQUIVO: api/Previas/get_previa.php
// Versão melhorada para carregar corretamente os novos campos de data E titulo_atendimento

// Desabilitar relatórios de erro para evitar HTML no JSON
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    include_once("../../config.php");

    // Verificar parâmetro de ID da prévia
    if (!isset($_GET['id'])) {
        throw new Exception("ID da prévia não fornecido");
    }
    
    $previaId = intval($_GET['id']);
    
    // Consulta para buscar detalhes da prévia incluindo titulo_atendimento e parecer_registros
    $sql = "SELECT p.*, 
           uc.nome AS nome_usuario_criacao,
           ua.nome AS nome_usuario_alteracao
    FROM previas p
    LEFT JOIN usuarios uc ON p.usuario_criacao_id = uc.id
    LEFT JOIN usuarios ua ON p.usuario_alteracao_id = ua.id
    WHERE p.id = ?";
    
    $stmt = $conn_pacientes->prepare($sql);
    $stmt->bind_param("i", $previaId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(["error" => "Prévia não encontrada"]);
        exit;
    }
    
    $previa = $result->fetch_assoc();
    
    // PROCESSAR MÚLTIPLOS REGISTROS DE PARECER COM NOVOS CAMPOS
    $parecerRegistros = [];
    
    if (!empty($previa['parecer_registros'])) {
        // Decodificar JSON dos múltiplos registros
        $registrosFromJSON = json_decode($previa['parecer_registros'], true);
        
        if (json_last_error() === JSON_ERROR_NONE && is_array($registrosFromJSON)) {
            // Processar cada registro garantindo que os novos campos estejam presentes
            foreach ($registrosFromJSON as $index => $registro) {
                $registroProcessado = [
                    'id' => $registro['id'] ?? ($index + 1),
                    'parecer' => $registro['parecer'] ?? '',
                    'parecerGuia' => $registro['parecerGuia'] ?? $registro['parecer_guia'] ?? '', // Compatibilidade
                    'finalizacao' => $registro['finalizacao'] ?? '',
                    'dataSolicitacao' => '', // NOVO CAMPO
                    'dataParecer' => $registro['dataParecer'] ?? $registro['data_parecer'] ?? '', // Compatibilidade
                    'tempoAnalise' => $registro['tempoAnalise'] ?? $registro['tempo_analise'] ?? null, // Compatibilidade
                    'observacoes' => $registro['observacoes'] ?? ''
                ];
                
                // NOVO: Garantir que dataSolicitacao seja preenchida
                if (!empty($registro['dataSolicitacao'])) {
                    $registroProcessado['dataSolicitacao'] = $registro['dataSolicitacao'];
                } else if (!empty($previa['data_solicitacao'])) {
                    // Se não há data específica no registro, usar a data geral da prévia
                    $registroProcessado['dataSolicitacao'] = date('d/m/Y', strtotime($previa['data_solicitacao']));
                }
                
                $parecerRegistros[] = $registroProcessado;
            }
        }
    }
    
    // Se não há registros múltiplos, criar um baseado nos campos antigos para compatibilidade
    if (empty($parecerRegistros)) {
        // Verificar se há dados nos campos antigos
        if (!empty($previa['parecer']) || !empty($previa['parecer_guia']) || !empty($previa['finalizacao'])) {
            $dataSolicitacaoFormatted = '';
            if (!empty($previa['data_solicitacao'])) {
                $dataSolicitacaoFormatted = date('d/m/Y', strtotime($previa['data_solicitacao']));
            }
            
            $dataParecerFormatted = '';
            if (!empty($previa['data_parecer_registrado'])) {
                $dataParecerFormatted = date('d/m/Y', strtotime($previa['data_parecer_registrado']));
            }
            
            $parecerRegistros = [[
                'id' => 1,
                'parecer' => $previa['parecer'] ?? '',
                'parecerGuia' => $previa['parecer_guia'] ?? '',
                'finalizacao' => $previa['finalizacao'] ?? '',
                'dataSolicitacao' => $dataSolicitacaoFormatted, // NOVO CAMPO
                'dataParecer' => $dataParecerFormatted,
                'tempoAnalise' => $previa['tempo_analise'] ?? null,
                'observacoes' => ''
            ]];
        } else {
            // Se não há dados nem nos campos antigos, criar registro vazio padrão com dataSolicitacao
            $dataSolicitacaoFormatted = '';
            if (!empty($previa['data_solicitacao'])) {
                $dataSolicitacaoFormatted = date('d/m/Y', strtotime($previa['data_solicitacao']));
            }
            
            $parecerRegistros = [[
                'id' => 1,
                'parecer' => '',
                'parecerGuia' => '',
                'finalizacao' => '',
                'dataSolicitacao' => $dataSolicitacaoFormatted, // NOVO CAMPO
                'dataParecer' => '',
                'tempoAnalise' => null,
                'observacoes' => ''
            ]];
        }
    }
    
    // Adicionar os registros processados à resposta
    $previa['parecer_registros_processed'] = $parecerRegistros;
    $previa['parecer_registros_count'] = count($parecerRegistros);
    
    // GARANTIR QUE titulo_atendimento esteja presente na resposta
    // (o campo já vem do SELECT *, mas vamos garantir que não seja null)
    if (!isset($previa['titulo_atendimento'])) {
        $previa['titulo_atendimento'] = '';
    }
    
    // Informações de compatibilidade e novas funcionalidades
    $previa['compatibility_info'] = [
        'has_multiple_records' => count($parecerRegistros) > 1,
        'source' => !empty($previa['parecer_registros']) ? 'json_field' : 'legacy_fields',
        'legacy_fields_present' => [
            'parecer' => !empty($previa['parecer']),
            'parecer_guia' => !empty($previa['parecer_guia']),
            'finalizacao' => !empty($previa['finalizacao']),
            'data_parecer_registrado' => !empty($previa['data_parecer_registrado']),
            'tempo_analise' => !empty($previa['tempo_analise'])
        ],
        'enhanced_features' => [
            'titulo_atendimento_support' => true,
            'data_solicitacao_support' => true,
            'auto_date_calculation' => true,
            'improved_time_analysis' => true,
            'parecer_registros_limit' => 5
        ]
    ];
    
    // NOVO: Adicionar informações de debug para verificar carregamento
    $previa['debug_info'] = [
        'original_parecer_registros_json' => $previa['parecer_registros'],
        'processed_records_count' => count($parecerRegistros),
        'titulo_atendimento_present' => !empty($previa['titulo_atendimento']),
        'titulo_atendimento_value' => $previa['titulo_atendimento'],
        'data_solicitacao_original' => $previa['data_solicitacao'],
        'data_solicitacao_formatted' => !empty($previa['data_solicitacao']) ? date('d/m/Y', strtotime($previa['data_solicitacao'])) : null,
        'has_data_fields' => [
            'data_solicitacao' => !empty($previa['data_solicitacao']),
            'data_parecer_registrado' => !empty($previa['data_parecer_registrado']),
            'tempo_analise' => isset($previa['tempo_analise'])
        ]
    ];
    
    echo json_encode($previa);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => $e->getMessage(),
        "enhanced_features_note" => "Esta versão suporta os novos campos de data para registros de parecer e titulo_atendimento"
    ]);
}

if (isset($conn_pacientes)) {
    $conn_pacientes->close();
}
?> 