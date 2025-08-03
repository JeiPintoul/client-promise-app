# 🚀 Guia de Integração com Backend

Este documento fornece instruções completas para integrar o frontend com sua API Spring Boot.

## 📋 Checklist de Integração

### ✅ Concluído
- [x] **API Client configurado** - Axios com interceptors
- [x] **Serviços da API** - authService, clienteService, usuarioService, promissoriaService, pagamentoService, configuracoesService, condicionalService
- [x] **Hooks reativos** - useAuth, useClientes, usePromissorias, useCondicionais
- [x] **Tipos TypeScript** - Interfaces alinhadas com DTOs do backend
- [x] **Sistema de Condicionais** - CRUD completo implementado
- [x] **Autenticação** - Login/logout com JWT
- [x] **Componentes principais** - CadastroCliente, ClientesList, LoginForm
- [x] **Configuração de ambiente** - VITE_API_BASE_URL

### 🔄 Em Progresso
- [ ] **Remoção do localStorage** - Alguns componentes ainda precisam ser refatorados
- [ ] **Tratamento de erros** - Implementar retry e fallbacks
- [ ] **Paginação completa** - Integrar em todos os componentes
- [ ] **Filtros avançados** - Conectar aos endpoints de busca

### 📋 Pendente
- [ ] **Dashboard** - Conectar estatísticas e gráficos
- [ ] **HistoricoTransacoes** - Migrar para pagamentoService
- [ ] **ConfiguracoesSistema** - Conectar ao configuracoesService
- [ ] **Testes de integração** - Validar todos os endpoints
- [ ] **Performance** - React Query e otimizações

## 🛠️ Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# URL da sua API Spring Boot
VITE_API_BASE_URL=http://localhost:8080/api
```

**Exemplos para diferentes ambientes:**
```bash
# Desenvolvimento
VITE_API_BASE_URL=http://localhost:8080/api

# Produção
VITE_API_BASE_URL=https://api.seudominio.com/api

# Staging
VITE_API_BASE_URL=https://api-staging.seudominio.com/api
```

### 2. Verificar Compatibilidade dos DTOs

Os tipos TypeScript estão organizados para corresponder aos seus DTOs:

**Autenticação:**
- `LoginRequest` → LoginRequestDTO
- `LoginResponse` → LoginResponseDTO

**Usuários:**
- `UsuarioRequest` → UsuarioRequestDTO
- `Usuario` → UsuarioResponseDTO

**Clientes:**
- `ClienteRequest` → ClienteRequestDTO
- `Cliente` → ClienteResponseDTO

**Promissórias:**
- `PromissoriaRequest` → PromissoriaRequestDTO
- `Promissoria` → PromissoriaResponseDTO

### 3. Estrutura de Paginação

O sistema usa Spring Data Pageable:

```typescript
// Request
PageRequest {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
}

// Response
PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}
```

## 🔧 Próximos Passos

### Fase 1: Validação Básica
1. **Testar autenticação**
   ```bash
   # Iniciar o projeto
   npm run dev
   
   # Verificar se o login funciona com sua API
   ```

2. **Verificar endpoints de clientes**
   - Listar clientes
   - Criar novo cliente
   - Editar cliente
   - Toggle elegibilidade

### Fase 2: Funcionalidades Core
1. **Promissórias**
   - Criar promissória
   - Listar promissórias
   - Pagamentos

2. **Sistema de Usuários**
   - Gestão de usuários
   - Alteração de senhas
   - Permissões

### Fase 3: Funcionalidades Avançadas
1. **Sistema de Condicionais**
   - Criar condicional
   - Finalizar condicional
   - Converter para promissória

2. **Dashboard e Relatórios**
   - Estatísticas financeiras
   - Gráficos de performance
   - Histórico de transações

## 🚨 Pontos de Atenção

### CORS
Certifique-se de que sua API Spring Boot permita requisições do frontend:

```java
@CrossOrigin(origins = {"http://localhost:5173", "https://seudominio.com"})
@RestController
public class AuthController {
    // ...
}
```

### Autenticação JWT
O frontend armazena o token em `localStorage` e o envia automaticamente em todas as requisições via interceptor do Axios.

### Tratamento de Erros
Os erros da API são automaticamente capturados e exibidos via toast. Verifique se sua API retorna mensagens de erro estruturadas.

### Validação de Campos
As validações no frontend são para UX. Mantenha as validações de segurança no backend.

## 📞 Suporte

Se encontrar problemas durante a integração:

1. **Verificar logs do console do navegador**
2. **Verificar logs da API Spring Boot**
3. **Testar endpoints diretamente via Postman/cURL**
4. **Verificar CORS e autenticação**

## 🎯 Resultado Esperado

Após a integração completa, você terá:

- ✅ Sistema de login funcional
- ✅ CRUD de clientes
- ✅ Gestão de promissórias
- ✅ Sistema de pagamentos
- ✅ Gestão de usuários
- ✅ Sistema de condicionais
- ✅ Dashboard com estatísticas
- ✅ Configurações do sistema

O projeto estará totalmente integrado com sua API, sem dependências de localStorage para dados de negócio.