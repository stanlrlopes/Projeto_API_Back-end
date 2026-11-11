import React, { useState } from 'react';
import { Mail, Lock, Sparkles } from 'lucide-react';
import {
  Button,
  Input,
  PasswordInput,
  Label,
  Card,
  Alert,
  Badge,
  Spinner,
  Modal,
  LoadingState,
} from '../components/ui';
import { useToast } from '../hooks/useToast';

export const DesignSystemPage: React.FC = () => {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
            Design System & Identidade Visual EducaAPI
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Catálogo interativo dos 11 componentes reutilizáveis implementados
            em <code className="font-mono">src/components/ui/</code>.
          </p>
        </div>
        <Badge variant="primary">FASE 3.2 • DESIGN SYSTEM</Badge>
      </div>

      {/* Paleta de Cores */}
      <Card
        title="Paleta Institucional & Semântica"
        subtitle="Cores oficiais definidas no planejamento visual da EducaAPI"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-[#0F172A] text-white">
            <span className="font-bold block">#0F172A</span>
            <span className="text-slate-300 text-[11px]">Primária Escura</span>
          </div>
          <div className="p-3.5 rounded-lg bg-[#1E3A8A] text-white">
            <span className="font-bold block">#1E3A8A</span>
            <span className="text-blue-200 text-[11px]">
              Azul Institucional
            </span>
          </div>
          <div className="p-3.5 rounded-lg bg-[#2563EB] text-white">
            <span className="font-bold block">#2563EB</span>
            <span className="text-blue-100 text-[11px]">Ação Primária</span>
          </div>
          <div className="p-3.5 rounded-lg bg-[#16A34A] text-white">
            <span className="font-bold block">#16A34A</span>
            <span className="text-emerald-100 text-[11px]">Sucesso</span>
          </div>
          <div className="p-3.5 rounded-lg bg-[#D97706] text-white">
            <span className="font-bold block">#D97706</span>
            <span className="text-amber-100 text-[11px]">Atenção</span>
          </div>
          <div className="p-3.5 rounded-lg bg-[#DC2626] text-white">
            <span className="font-bold block">#DC2626</span>
            <span className="text-red-100 text-[11px]">Erro / Crítico</span>
          </div>
        </div>
      </Card>

      {/* Botões e Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Buttons & Estados"
          subtitle="Variantes primary, secondary, outline, ghost e danger"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2.5">
              <Button variant="primary">Primário</Button>
              <Button variant="secondary">Secundário</Button>
              <Button variant="outline">Contorno</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Perigo</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
              <Button size="sm" variant="primary">
                Pequeno (sm)
              </Button>
              <Button size="md" variant="primary">
                Médio (md)
              </Button>
              <Button size="lg" variant="primary">
                Grande (lg)
              </Button>
              <Button variant="primary" isLoading>
                Carregando
              </Button>
            </div>
          </div>
        </Card>

        <Card
          title="Badges, Spinners & Modal / Toast"
          subtitle="Indicadores visuais e feedbacks interativos"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">ADMIN</Badge>
              <Badge variant="info">PROFESSOR</Badge>
              <Badge variant="success">ALUNO • ATIVO</Badge>
              <Badge variant="warning">PENDENTE</Badge>
              <Badge variant="danger">REPROVADO</Badge>
              <Badge variant="neutral">NEUTRO</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Sparkles className="w-4 h-4" />}
                onClick={() => setIsModalOpen(true)}
              >
                Abrir Modal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  toast.success(
                    'Notificação de Teste',
                    'Componente Toast disparado com sucesso!',
                  )
                }
              >
                Disparar Toast
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Inputs e Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Inputs, Labels & PasswordInput"
          subtitle="Campos de formulário acessíveis com suporte a ícones e erro"
        >
          <div className="space-y-4">
            <div>
              <Label required>Exemplo de Label Institucional</Label>
              <Input
                placeholder="Digite um e-mail institucional"
                leftIcon={<Mail className="w-4 h-4" />}
                helperText="Texto auxiliar de orientação ao usuário."
              />
            </div>

            <PasswordInput
              label="Campo de Senha com Alternância"
              placeholder="Clique no ícone de olho para exibir/ocultar"
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Input
              label="Campo com Estado de Erro"
              defaultValue="email-invalido"
              error="Informe um endereço de e-mail válido."
            />
          </div>
        </Card>

        <Card
          title="Alertas & LoadingState"
          subtitle="Feedbacks contextuais de sucesso, aviso, erro e carregamento"
        >
          <div className="space-y-3">
            <Alert variant="info" title="Informação Institucional">
              Mensagem informativa padrão do Design System EducaAPI.
            </Alert>
            <Alert variant="success" title="Operação Concluída">
              Os dados foram validados e registrados com sucesso.
            </Alert>
            <Alert variant="warning" title="Atenção">
              Verifique os vínculos acadêmicos antes de prosseguir.
            </Alert>
            <Alert variant="error" title="Erro de Validação">
              Não foi possível autenticar com as credenciais fornecidas.
            </Alert>
            <div className="pt-2">
              <LoadingState label="Exemplo de componente LoadingState..." />
            </div>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Modal Institucional EducaAPI"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsModalOpen(false);
                toast.info('Modal confirmado', 'Ação executada com sucesso.');
              }}
            >
              Confirmar
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Este componente <code className="font-mono">Modal</code> faz parte do
          Design System criado na Fase 3.2 e será reutilizado nos fluxos de
          confirmação e formulários das próximas fases.
        </p>
      </Modal>
    </div>
  );
};
