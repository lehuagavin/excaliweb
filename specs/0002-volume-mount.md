# Spec 0002: 容器挂载目录与工作区隔离

## 概述

为ExcaliWeb应用添加Docker volume挂载支持，实现数据持久化和工作区隔离。应用启动时自动使用挂载目录作为工作区，所有文件操作限制在该挂载目录内。

## 目标

1. **数据持久化**：容器重启或重建后数据不丢失
2. **默认工作区**：应用启动时自动打开挂载目录，无需手动选择
3. **安全隔离**：所有文件操作严格限制在挂载目录内，禁止访问其他路径
4. **灵活配置**：支持通过环境变量配置挂载路径

## 当前问题

### 1. 数据持久化缺失
- 所有Excalidraw文件存储在容器内部
- 容器删除后数据全部丢失
- 工作区路径需要每次手动选择

### 2. 工作区管理不便
- 用户每次启动需要通过UI选择工作区
- 无法预设默认工作区
- 多容器部署时无法共享数据

### 3. 路径访问范围过大
- 理论上可以访问容器内任意路径（虽然有validatePath保护）
- 缺少明确的数据边界

## 解决方案

### 方案A：单一挂载目录（推荐）

#### 1. Docker配置

##### 1.1 Dockerfile修改

在Dockerfile中定义数据目录和volume：

```dockerfile
# 在production stage中添加
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data

# 声明volume（可选，有助于文档化）
VOLUME ["/app/data"]
```

##### 1.2 Makefile修改

在`deploy`和`run`命令中添加volume挂载：

```makefile
# 添加新变量
DATA_DIR ?= $(shell pwd)/data  # 默认使用当前目录下的data文件夹

# 修改run命令
run:
	@echo "🚀 Starting container..."
	docker run -d \
		--name $(CONTAINER_NAME) \
		-p $(PORT):80 \
		-v $(DATA_DIR):/app/data \
		-e DATA_DIR=/app/data \
		-e DEFAULT_WORKSPACE=true \
		--restart unless-stopped \
		$(IMAGE_NAME):$(DOCKER_TAG)
	@echo "✅ Container started"
	@echo "📂 Data directory: $(DATA_DIR)"
```

##### 1.3 创建docker-compose.yml（推荐）

```yaml
version: '3.8'

services:
  excaliweb:
    image: excaliweb:latest
    container_name: excaliweb-app
    ports:
      - "5174:80"
    volumes:
      - ./data:/app/data
    environment:
      - DATA_DIR=/app/data
      - DEFAULT_WORKSPACE=true
      - NODE_ENV=production
      - PORT=3001
      - CLIENT_URL=http://localhost
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
```

#### 2. 后端修改

##### 2.1 环境变量定义

在`server/src/server.ts`开头添加：

```typescript
// 环境变量配置
const DATA_DIR = process.env.DATA_DIR || '/app/data';
const DEFAULT_WORKSPACE = process.env.DEFAULT_WORKSPACE === 'true';
const DEFAULT_WORKSPACE_NAME = process.env.DEFAULT_WORKSPACE_NAME || 'my-workspace';
```

##### 2.2 启动时初始化工作区

在`server.ts`的启动逻辑中添加：

```typescript
import path from 'path';
import fs from 'fs/promises';

async function initializeDefaultWorkspace() {
  try {
    // 确保数据目录存在
    await fs.mkdir(DATA_DIR, { recursive: true });

    if (DEFAULT_WORKSPACE) {
      const workspacePath = path.join(DATA_DIR, DEFAULT_WORKSPACE_NAME);

      // 创建默认工作区文件夹（如果不存在）
      await fs.mkdir(workspacePath, { recursive: true });

      // 设置为当前工作区
      fileSystemService.setWorkspacePath(workspacePath);

      console.log(`✅ Default workspace initialized: ${workspacePath}`);

      // 创建示例文件（仅在工作区为空时）
      const files = await fs.readdir(workspacePath);
      const excalidrawFiles = files.filter(f => f.endsWith('.excalidraw'));

      if (excalidrawFiles.length === 0) {
        const welcomeFile = path.join(workspacePath, 'Welcome.excalidraw');
        const welcomeContent = {
          type: 'excalidraw',
          version: 2,
          source: 'https://excalidraw.com',
          elements: [
            {
              type: 'text',
              id: 'welcome-text',
              x: 100,
              y: 100,
              width: 400,
              height: 50,
              text: 'Welcome to ExcaliWeb!\n\nStart drawing or create a new file.',
              fontSize: 20,
              fontFamily: 1,
              textAlign: 'center',
              verticalAlign: 'middle'
            }
          ],
          appState: {
            viewBackgroundColor: '#ffffff'
          }
        };

        await fs.writeFile(welcomeFile, JSON.stringify(welcomeContent, null, 2));
        console.log(`✅ Welcome file created: ${welcomeFile}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to initialize default workspace:', error);
    throw error;
  }
}

// 在启动服务器前调用
app.listen(port, async () => {
  if (DEFAULT_WORKSPACE) {
    await initializeDefaultWorkspace();
  }
  console.log(`🚀 Server running on port ${port}`);
});
```

##### 2.3 增强路径验证

修改`server/src/services/fileSystem.ts`中的`validatePath`方法：

```typescript
private validatePath(relativePath: string): string {
  if (!this.workspacePath) {
    throw new Error('Workspace path not set');
  }

  // 移除工作区名前缀（如果存在）
  const workspaceName = path.basename(this.workspacePath);
  if (relativePath.startsWith(workspaceName + '/') || relativePath.startsWith(workspaceName + '\\')) {
    relativePath = relativePath.substring(workspaceName.length + 1);
  }

  // 规范化路径并确保它在工作区内
  const fullPath = path.resolve(this.workspacePath, relativePath);
  const normalizedWorkspace = path.resolve(this.workspacePath);

  // 严格检查：路径必须在工作区内
  if (!fullPath.startsWith(normalizedWorkspace)) {
    console.warn(`⚠️  Attempted to access path outside workspace: ${fullPath}`);
    throw new Error('Invalid path: Access outside workspace is not allowed');
  }

  // 额外检查：如果设置了DATA_DIR，确保路径也在DATA_DIR内
  const dataDir = process.env.DATA_DIR;
  if (dataDir) {
    const normalizedDataDir = path.resolve(dataDir);
    if (!fullPath.startsWith(normalizedDataDir)) {
      console.error(`🚫 Security violation: Attempted to access path outside DATA_DIR: ${fullPath}`);
      throw new Error('Invalid path: Access outside data directory is not allowed');
    }
  }

  return fullPath;
}
```

##### 2.4 修改工作区API

修改`server/src/routes/workspace.ts`：

```typescript
// 添加获取默认工作区的端点
router.get('/default', (req: Request, res: Response) => {
  const dataDir = process.env.DATA_DIR;
  const defaultWorkspace = process.env.DEFAULT_WORKSPACE === 'true';
  const workspaceName = process.env.DEFAULT_WORKSPACE_NAME || 'my-workspace';

  if (defaultWorkspace && dataDir) {
    res.json({
      enabled: true,
      path: path.join(dataDir, workspaceName),
      name: workspaceName
    });
  } else {
    res.json({
      enabled: false
    });
  }
});

// 修改setWorkspace端点，限制只能设置DATA_DIR内的路径
router.post('/set', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { path: workspacePath } = req.body;

    if (!workspacePath) {
      res.status(400).json({ error: 'Workspace path is required' });
      return;
    }

    // 验证路径在DATA_DIR内
    const dataDir = process.env.DATA_DIR;
    if (dataDir) {
      const normalizedPath = path.resolve(workspacePath);
      const normalizedDataDir = path.resolve(dataDir);

      if (!normalizedPath.startsWith(normalizedDataDir)) {
        res.status(403).json({
          error: 'Invalid workspace path: Must be within data directory',
          dataDir: dataDir
        });
        return;
      }
    }

    // 验证路径存在且可访问
    await fs.access(workspacePath);

    fileSystemService.setWorkspacePath(workspacePath);
    res.json({
      message: 'Workspace set successfully',
      path: workspacePath
    });
  } catch (error) {
    next(error);
  }
});
```

##### 2.5 修改文件系统浏览API

修改`server/src/routes/filesystem.ts`，限制浏览范围：

```typescript
// 修改list端点
router.get('/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestedPath = (req.query.path as string) || '';
    const dataDir = process.env.DATA_DIR;

    // 如果配置了DATA_DIR，限制浏览范围
    let basePath = requestedPath;
    if (dataDir) {
      if (!requestedPath) {
        basePath = dataDir;
      } else {
        const normalizedPath = path.resolve(requestedPath);
        const normalizedDataDir = path.resolve(dataDir);

        if (!normalizedPath.startsWith(normalizedDataDir)) {
          res.status(403).json({
            error: 'Access denied: Path outside data directory',
            allowedPath: dataDir
          });
          return;
        }
        basePath = normalizedPath;
      }
    }

    // 验证路径是否存在且可访问
    try {
      await fs.access(basePath);
      const stats = await fs.stat(basePath);

      if (!stats.isDirectory()) {
        res.status(400).json({ error: 'Path is not a directory' });
        return;
      }
    } catch (error) {
      res.status(404).json({ error: 'Directory not found or not accessible' });
      return;
    }

    // 读取目录内容，仅返回目录
    const entries = await fs.readdir(basePath, { withFileTypes: true });
    const directories = entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(entry => ({
        name: entry.name,
        path: path.join(basePath, entry.name)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      currentPath: basePath,
      parentPath: dataDir && basePath !== dataDir ? path.dirname(basePath) : null,
      directories
    });
  } catch (error) {
    next(error);
  }
});

// 禁用或修改home和common端点
router.get('/home', (req: Request, res: Response) => {
  const dataDir = process.env.DATA_DIR;
  if (dataDir) {
    res.json({ path: dataDir });
  } else {
    res.json({ path: os.homedir() });
  }
});

router.get('/common', (req: Request, res: Response) => {
  const dataDir = process.env.DATA_DIR;

  if (dataDir) {
    // 只返回DATA_DIR及其子文件夹
    res.json([
      { name: 'Data Directory', path: dataDir }
    ]);
  } else {
    // 原有逻辑
    const homeDir = os.homedir();
    const commonDirs = [
      { name: 'Home', path: homeDir },
      { name: 'Documents', path: path.join(homeDir, 'Documents') },
      { name: 'Desktop', path: path.join(homeDir, 'Desktop') },
      { name: 'Downloads', path: path.join(homeDir, 'Downloads') },
    ];
    res.json(commonDirs);
  }
});
```

##### 2.6 更新supervisord.conf

添加新的环境变量：

```ini
[program:backend]
command=node dist/server.js
directory=/app
environment=NODE_ENV="production",PORT="3001",CLIENT_URL="http://localhost",DATA_DIR="/app/data",DEFAULT_WORKSPACE="true",DEFAULT_WORKSPACE_NAME="my-workspace"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
```

#### 3. 前端修改

##### 3.1 修改API客户端

在`client/src/utils/api.ts`中添加：

```typescript
// 获取默认工作区配置
export async function getDefaultWorkspace(): Promise<{
  enabled: boolean;
  path?: string;
  name?: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/workspace/default`);
  if (!response.ok) {
    throw new Error('Failed to get default workspace configuration');
  }
  return response.json();
}
```

##### 3.2 修改App.tsx

修改初始化逻辑，优先使用默认工作区：

```typescript
useEffect(() => {
  const initializeWorkspace = async () => {
    try {
      setIsLoading(true);

      // 1. 检查是否配置了默认工作区
      const defaultConfig = await getDefaultWorkspace();

      if (defaultConfig.enabled && defaultConfig.path) {
        // 使用默认工作区
        console.log('Using default workspace:', defaultConfig.path);
        await selectWorkspace(defaultConfig.path);

        // 保存到localStorage（可选）
        localStorage.setItem('workspacePath', defaultConfig.path);

        setWorkspacePath(defaultConfig.path);
        setShowWorkspaceModal(false);
      } else {
        // 2. 尝试从localStorage恢复
        const savedPath = localStorage.getItem('workspacePath');
        if (savedPath) {
          try {
            const response = await getWorkspace();
            if (response.path) {
              setWorkspacePath(response.path);
              setShowWorkspaceModal(false);
            } else {
              setShowWorkspaceModal(true);
            }
          } catch (error) {
            console.error('Failed to restore workspace:', error);
            setShowWorkspaceModal(true);
          }
        } else {
          // 3. 显示工作区选择对话框
          setShowWorkspaceModal(true);
        }
      }
    } catch (error) {
      console.error('Failed to initialize workspace:', error);
      setShowWorkspaceModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  initializeWorkspace();
}, []);
```

##### 3.3 修改WorkspaceModal.tsx（可选）

添加提示信息，告知用户当前使用的是受限的工作区：

```typescript
// 在WorkspaceModal组件中添加
const [defaultWorkspace, setDefaultWorkspace] = useState<{
  enabled: boolean;
  path?: string;
  name?: string;
} | null>(null);

useEffect(() => {
  const fetchDefaultConfig = async () => {
    try {
      const config = await getDefaultWorkspace();
      setDefaultWorkspace(config);
    } catch (error) {
      console.error('Failed to fetch default workspace config:', error);
    }
  };

  if (isOpen) {
    fetchDefaultConfig();
  }
}, [isOpen]);

// 在UI中显示提示
{defaultWorkspace?.enabled && (
  <div style={{
    padding: '12px',
    backgroundColor: '#e3f2fd',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px'
  }}>
    ℹ️ This application is configured to use a specific data directory.
    You can only select workspaces within: <strong>{defaultWorkspace.path}</strong>
  </div>
)}
```

#### 4. 使用说明

##### 4.1 基本使用

```bash
# 1. 创建本地数据目录
mkdir -p ./data

# 2. 使用Makefile部署（推荐）
make deploy DATA_DIR=$(pwd)/data

# 或使用docker-compose
docker-compose up -d

# 3. 访问应用
open http://localhost:5174
```

##### 4.2 自定义数据目录

```bash
# 指定自定义路径
make deploy DATA_DIR=/path/to/my/drawings

# 或修改docker-compose.yml中的volumes配置
volumes:
  - /path/to/my/drawings:/app/data
```

##### 4.3 数据备份

```bash
# 备份数据目录
tar -czf excalidraw-backup-$(date +%Y%m%d).tar.gz ./data

# 恢复数据
tar -xzf excalidraw-backup-20260202.tar.gz
```

### 方案B：多工作区支持（备选方案）

允许在单个挂载目录下创建多个工作区，用户可以在不同工作区之间切换。

#### 区别
- 挂载点：`/app/data`（相同）
- 工作区路径：`/app/data/workspace1`, `/app/data/workspace2`...
- 前端UI：保留工作区选择功能，但限制浏览范围在`/app/data`内

#### 优势
- 更灵活，支持多项目/团队
- 可以通过不同的工作区隔离不同的绘图集合

#### 劣势
- 需要用户手动管理工作区
- 配置稍复杂

## 技术细节

### 1. 路径安全

所有路径验证遵循以下原则：

```
用户请求路径
  ↓
base64解码
  ↓
移除工作区名前缀
  ↓
path.resolve()规范化
  ↓
检查是否在workspacePath内
  ↓
检查是否在DATA_DIR内
  ↓
返回绝对路径 或 抛出错误
```

### 2. 默认目录结构

```
/app/data/                          # 挂载点
└── my-workspace/                   # 默认工作区
    ├── Welcome.excalidraw          # 欢迎文件
    ├── projects/                   # 示例文件夹结构
    │   └── project-a.excalidraw
    └── archive/
        └── old-drawing.excalidraw
```

### 3. 环境变量说明

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DATA_DIR` | `/app/data` | 挂载目录在容器内的路径 |
| `DEFAULT_WORKSPACE` | `true` | 是否启用默认工作区 |
| `DEFAULT_WORKSPACE_NAME` | `my-workspace` | 默认工作区文件夹名 |

### 4. 健康检查增强

可以添加数据目录的健康检查：

```typescript
// 在server.ts的/health端点中添加
app.get('/health', async (req, res) => {
  const checks = {
    server: 'ok',
    workspace: fileSystemService.getWorkspacePath() ? 'ok' : 'not configured',
    dataDir: 'ok'
  };

  // 检查数据目录
  const dataDir = process.env.DATA_DIR;
  if (dataDir) {
    try {
      await fs.access(dataDir);
      checks.dataDir = 'ok';
    } catch {
      checks.dataDir = 'inaccessible';
    }
  }

  const allOk = Object.values(checks).every(v => v === 'ok');
  res.status(allOk ? 200 : 503).json(checks);
});
```

## 实施计划

### Phase 1: Docker配置（1-2小时）
- [ ] 修改Dockerfile，添加DATA_DIR和volume声明
- [ ] 修改Makefile，添加volume挂载参数
- [ ] 创建docker-compose.yml
- [ ] 更新supervisord.conf环境变量

### Phase 2: 后端实现（3-4小时）
- [ ] 添加initializeDefaultWorkspace()函数
- [ ] 增强validatePath()安全检查
- [ ] 修改workspace.ts路由
- [ ] 修改filesystem.ts路由，限制浏览范围
- [ ] 添加healthcheck增强
- [ ] 编写单元测试

### Phase 3: 前端实现（2-3小时）
- [ ] 添加getDefaultWorkspace() API调用
- [ ] 修改App.tsx初始化逻辑
- [ ] 更新WorkspaceModal.tsx显示提示
- [ ] 测试用户体验流程

### Phase 4: 测试与文档（2小时）
- [ ] 端到端测试
- [ ] 数据持久化测试
- [ ] 路径安全测试
- [ ] 更新README.md
- [ ] 编写部署文档

**总预计时间：8-11小时**

## 风险与缓解

### 风险1：现有数据迁移
**影响**：用户升级后需要迁移数据
**缓解**：
- 提供迁移脚本
- 在README中明确说明迁移步骤
- 保持向后兼容（DEFAULT_WORKSPACE=false时使用旧行为）

### 风险2：路径权限问题
**影响**：Docker容器可能无法访问挂载目录
**缓解**：
- 在文档中说明需要设置正确的文件权限
- 使用非root用户运行容器（添加USER指令）
- 提供权限修复命令示例

### 风险3：性能问题
**影响**：大量文件时文件树加载慢
**缓解**：
- 实现分页或懒加载
- 添加缓存机制
- 优化递归文件树算法

## 替代方案

### 方案C：使用Docker Named Volume
```yaml
volumes:
  excalidraw-data:
    driver: local

services:
  excaliweb:
    volumes:
      - excalidraw-data:/app/data
```

**优势**：
- Docker自动管理volume
- 更好的跨平台兼容性

**劣势**：
- 数据位置不直观
- 备份稍复杂

### 方案D：使用外部数据库
将文件元数据存储在数据库（如MongoDB/PostgreSQL），文件内容仍然存储在挂载目录。

**优势**：
- 更好的查询性能
- 支持复杂的权限管理

**劣势**：
- 增加系统复杂度
- 需要额外的数据库容器

## 测试计划

### 单元测试
- [ ] validatePath()边界测试
- [ ] initializeDefaultWorkspace()各种场景
- [ ] 路径编码/解码测试

### 集成测试
- [ ] 容器启动后自动创建工作区
- [ ] 文件CRUD操作限制在DATA_DIR内
- [ ] 尝试访问DATA_DIR外路径应被拒绝

### E2E测试
- [ ] 用户首次访问自动进入默认工作区
- [ ] 创建/删除/重命名文件/文件夹
- [ ] 容器重启后数据保持
- [ ] 多容器共享volume（如果需要）

## 文档更新

需要更新以下文档：

1. **README.md**
   - 添加Docker volume挂载说明
   - 环境变量配置说明
   - 数据备份与恢复指南

2. **DEPLOYMENT.md**（新建）
   - 详细的部署步骤
   - docker-compose使用说明
   - 常见问题排查

3. **API.md**（更新）
   - 新的workspace/default端点
   - 路径限制说明

## 成功标准

1. ✅ 使用docker-compose一键启动后，应用自动使用挂载目录
2. ✅ 所有文件操作限制在挂载目录内
3. ✅ 容器删除重建后数据完整保留
4. ✅ 尝试访问挂载目录外路径被拒绝并记录日志
5. ✅ 通过所有单元测试和集成测试
6. ✅ 文档完整，新用户可以按照文档成功部署

## 参考资料

- [Docker Volume Documentation](https://docs.docker.com/storage/volumes/)
- [Docker Compose File Reference](https://docs.docker.com/compose/compose-file/)
- [Node.js Path Module](https://nodejs.org/api/path.html)
- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
