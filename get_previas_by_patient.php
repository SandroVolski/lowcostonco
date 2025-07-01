<?php
// ARQUIVO: api/Previas/get_previas_by_patient.php
// Versão atualizada com suporte ao titulo_atendimento

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

    // Verificar parâmetro de ID do paciente
    if (!isset($_GET['paciente_id'])) {
        throw new Exception("ID do paciente não fornecido");
    }
    
    $pacienteId = intval($_GET['paciente_id']);
    
    // Consulta para buscar todas as prévias do paciente incluindo titulo_atendimento
    $sql = "SELECT p.id, 
                   p.numero_sequencial,
                   p.codigo_composto,
                   p.titulo_atendimento,
                   p.guia,
                   p.protocolo,
                   p.cid,
                   p.ciclos_previstos,
                   p.data_emissao_guia,
                   p.data_encaminhamento_af,
                   p.data_solicitacao,
                   p.parecer,
                   p.comentario,
                   p.peso,
                   p.altura,
                   p.parecer_guia,
                   p.finalizacao,
                   p.inconsistencia,
                   p.data_parecer_registrado,
                   p.tempo_analise,
                   p.parecer_registros,
                   p.data_criacao,
                   p.data_atualizacao,
                   uc.nome AS nome_usuario_criacao,
                   ua.nome AS nome_usuario_alteracao
            FROM previas p
            LEFT JOIN usuarios uc ON p.usuario_criacao_id = uc.id
            LEFT JOIN usuarios ua ON p.usuario_alteracao_id = ua.id
            WHERE p.paciente_id = ?
            ORDER BY p.data_criacao DESC";
    
    $stmt = $conn_pacientes->prepare($sql);
    $stmt->bind_param("i", $pacienteId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $previas = [];
    
    while ($row = $result->fetch_assoc()) {
        // Processar múltiplos registros de parecer para cada prévia
        $parecerRegistros = [];
        
        if (!empty($row['parecer_registros'])) {
            $registrosFromJSON = json_decode($row['parecer_registros'], true);
            
            if (json_last_error() === JSON_ERROR_NONE && is_array($registrosFromJSON)) {
                foreach ($registrosFromJSON as $index => $registro) {
                    $registroProcessado = [
                        'id' => $registro['id'] ?? ($index + 1),
                        'parecer' => $registro['parecer'] ?? '',
                        'parecerGuia' => $registro['parecerGuia'] ?? $registro['parecer_guia'] ?? '',
                        'finalizacao' => $registro['finalizacao'] ?? '',
                        'dataSolicitacao' => '',
                        'dataParecer' => $registro['dataParecer'] ?? $registro['data_parecer'] ?? '',
                        'tempoAnalise' => $registro['tempoAnalise'] ?? $registro['tempo_analise'] ?? null,
                        'observacoes' => $registro['observacoes'] ?? ''
                    ];
                    
                    // Garantir que dataSolicitacao seja preenchida
                    if (!empty($registro['dataSolicitacao'])) {
                        $registroProcessado['dataSolicitacao'] = $registro['dataSolicitacao'];
                    } else if (!empty($row['data_solicitacao'])) {
                        $registroProcessado['dataSolicitacao'] = date('d/m/Y', strtotime($row['data_solicitacao']));
                    }
                    
                    $parecerRegistros[] = $registroProcessado;
                }
            }
        }
        
        // Se não há registros múltiplos, criar um baseado nos campos antigos
        if (empty($parecerRegistros)) {
            $dataSolicitacaoFormatted = '';
            if (!empty($row['data_solicitacao'])) {
                $dataSolicitacaoFormatted = date('d/m/Y', strtotime($row['data_solicitacao']));
            }
            
            $dataParecerFormatted = '';
            if (!empty($row['data_parecer_registrado'])) {
                $dataParecerFormatted = date('d/m/Y', strtotime($row['data_parecer_registrado']));
            }
            
            $parecerRegistros = [[
                'id' => 1,
                'parecer' => $row['parecer'] ?? '',
                'parecerGuia' => $row['parecer_guia'] ?? '',
                'finalizacao' => $row['finalizacao'] ?? '',
                'dataSolicitacao' => $dataSolicitacaoFormatted,
                'dataParecer' => $dataParecerFormatted,
                'tempoAnalise' => $row['tempo_analise'] ?? null,
                'observacoes' => ''
            ]];
        }
        
        // Adicionar os registros processados à prévia
        $row['parecer_registros_processed'] = $parecerRegistros;
        $row['parecer_registros_count'] = count($parecerRegistros);
        
        // Garantir que titulo_atendimento não seja null
        if (!isset($row['titulo_atendimento'])) {
            $row['titulo_atendimento'] = '';
        }
        
        $previas[] = $row;
    }
    
    // Adicionar informações de resumo
    $response = [
        'success' => true,
        'data' => $previas,
        'count' => count($previas),
        'paciente_id' => $pacienteId,
        'features' => [
            'titulo_atendimento_support' => true,
            'parecer_registros_support' => true,
            'data_solicitacao_support' => true,
            'enhanced_time_analysis' => true
        ]
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage(),
        "features_note" => "Esta versão suporta titulo_atendimento e múltiplos registros de parecer"
    ]);
}

if (isset($conn_pacientes)) {
    $conn_pacientes->close();
}
?> 