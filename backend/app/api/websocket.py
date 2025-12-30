"""
WebSocket endpoint для уведомлений в реальном времени
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Optional
import json
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: dict = {}  # user_id -> list of websockets
    
    async def connect(self, websocket: WebSocket, user_id: Optional[int] = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, user_id: Optional[int] = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id and user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def send_to_user(self, message: dict, user_id: int):
        """Отправляет сообщение конкретному пользователю"""
        if user_id in self.user_connections:
            message_str = json.dumps(message)
            disconnected = []
            for connection in self.user_connections[user_id]:
                try:
                    await connection.send_text(message_str)
                except:
                    disconnected.append(connection)
            
            for conn in disconnected:
                self.disconnect(conn, user_id)
    
    async def broadcast(self, message: dict):
        message_str = json.dumps(message)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message_str)
            except:
                disconnected.append(connection)
        
        # Удаляем отключенные соединения
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = None
):
    """
    WebSocket endpoint для уведомлений в реальном времени.
    Токен можно передать через query параметр ?token=... или через сообщение после подключения.
    """
    # Логируем попытку подключения
    print(f"[WebSocket] ====== ENDPOINT CALLED ======")
    print(f"[WebSocket] Client: {websocket.client}")
    print(f"[WebSocket] Headers: {dict(websocket.headers)}")
    origin = websocket.headers.get("origin") or websocket.headers.get("Origin")
    print(f"[WebSocket] Connection attempt from origin: {origin}")
    print(f"[WebSocket] Path: {websocket.url.path}")
    print(f"[WebSocket] Query params: {dict(websocket.query_params)}")
    print(f"[WebSocket] Token provided: {bool(token)}")
    if token:
        print(f"[WebSocket] Token length: {len(token)}")
    
    user_id = None
    authenticated = False
    
    # Если токен передан через query параметры, проверяем его ДО принятия соединения
    if token:
        try:
            from app.auth.security import verify_token
            from app.database import SessionLocal
            from app.models.user import User
            
            payload = verify_token(token)
            username = payload.get("sub")
            if username:
                db = SessionLocal()
                try:
                    user = db.query(User).filter(User.username == username).first()
                    if user:
                        user_id = user.id
                        authenticated = True
                        print(f"[WebSocket] Authenticated user: {username} (ID: {user_id})")
                finally:
                    db.close()
        except Exception as e:
            print(f"[WebSocket] Token verification failed: {e}")
            # Не отклоняем соединение, просто помечаем как неаутентифицированное
            # Пользователь может отправить токен позже через сообщение
    
    # Принимаем соединение
    # Для WebSocket FastAPI не применяет CORS middleware автоматически,
    # но Starlette может проверять origin. Принимаем соединение без строгой проверки.
    try:
        print("[WebSocket] Attempting to accept connection...")
        
        # Разрешенные origins для логирования
        allowed_origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",  # Vite dev server может использовать другой порт
            "http://127.0.0.1:5173",
            "http://localhost:5174",  # Альтернативный порт Vite
            "http://127.0.0.1:5174",
        ]
        
        # Получаем origin для логирования
        origin = websocket.headers.get("origin") or websocket.headers.get("Origin")
        print(f"[WebSocket] Origin from headers: {origin}")
        
        # Проверяем origin для логирования, но принимаем соединение в любом случае
        if origin:
            if origin not in allowed_origins:
                print(f"[WebSocket] Warning: Origin '{origin}' not in allowed list")
                print(f"[WebSocket] Allowed origins: {allowed_origins}")
            else:
                print(f"[WebSocket] Origin '{origin}' is allowed")
        else:
            print("[WebSocket] No origin header found (may be from same origin or browser extension)")
        
        # Принимаем соединение БЕЗ проверки origin
        # Starlette не проверяет origin автоматически для WebSocket
        # Мы принимаем все соединения независимо от origin
        try:
            await websocket.accept()
            print("[WebSocket] Connection accepted successfully!")
        except Exception as accept_exception:
            print(f"[WebSocket] Exception during accept(): {accept_exception}")
            print(f"[WebSocket] Exception type: {type(accept_exception)}")
            import traceback
            traceback.print_exc()
            raise
        
        # Добавляем в менеджер соединений
        await manager.connect(websocket, user_id if authenticated else None)
        
    except Exception as accept_error:
        print(f"[WebSocket] Error in accept(): {accept_error}")
        print(f"[WebSocket] Accept error type: {type(accept_error)}")
        print(f"[WebSocket] Accept error args: {accept_error.args if hasattr(accept_error, 'args') else 'N/A'}")
        import traceback
        traceback.print_exc()
        try:
            await websocket.close(code=1008, reason="Connection rejected")
        except:
            pass
        return
    
    try:
        # Отправляем приветственное сообщение
        await manager.send_personal_message(
            json.dumps({
                "type": "connected",
                "message": "Подключено к системе уведомлений",
                "authenticated": authenticated,
                "timestamp": datetime.now().isoformat()
            }),
            websocket
        )
        
        # Если токен не был передан через query параметры, но соединение установлено,
        # ожидаем токен через сообщение
        if not authenticated:
            print("[WebSocket] Waiting for authentication token...")
        
        # Ожидаем сообщения от клиента (ping/pong для поддержания соединения)
        while True:
            try:
                data = await websocket.receive_text()
                try:
                    message = json.loads(data)
                    
                    if message.get("type") == "ping":
                        await manager.send_personal_message(
                            json.dumps({
                                "type": "pong",
                                "timestamp": datetime.now().isoformat()
                            }),
                            websocket
                        )
                    
                    elif message.get("type") == "auth" and message.get("token"):
                        # Аутентификация через сообщение (если токен не был передан через query)
                        if not authenticated:
                            try:
                                from app.auth.security import verify_token
                                from app.database import SessionLocal
                                from app.models.user import User
                                
                                payload = verify_token(message.get("token"))
                                username = payload.get("sub")
                                if username:
                                    db = SessionLocal()
                                    try:
                                        user = db.query(User).filter(User.username == username).first()
                                        if user:
                                            user_id = user.id
                                            authenticated = True
                                            # Обновляем менеджер соединений
                                            manager.user_connections.setdefault(user_id, []).append(websocket)
                                            
                                            await manager.send_personal_message(
                                                json.dumps({
                                                    "type": "auth_success",
                                                    "message": "Аутентификация успешна",
                                                    "user_id": user_id
                                                }),
                                                websocket
                                            )
                                            print(f"[WebSocket] User authenticated via message: {username} (ID: {user_id})")
                                    finally:
                                        db.close()
                            except Exception as e:
                                print(f"WebSocket auth error: {e}")
                                await manager.send_personal_message(
                                    json.dumps({
                                        "type": "auth_error",
                                        "message": "Ошибка аутентификации"
                                    }),
                                    websocket
                                )
                        else:
                            await manager.send_personal_message(
                                json.dumps({
                                    "type": "auth_info",
                                    "message": "Уже аутентифицирован"
                                }),
                                websocket
                            )
                    
                except json.JSONDecodeError:
                    print(f"[WebSocket] Invalid JSON received: {data}")
                    pass
            except Exception as e:
                print(f"WebSocket receive error: {e}")
                break
                
    except WebSocketDisconnect:
        print(f"[WebSocket] Client disconnected")
        manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        import traceback
        traceback.print_exc()
        manager.disconnect(websocket, user_id)

# Функция для отправки уведомления всем подключенным клиентам
async def broadcast_notification(notification_type: str, title: str, message: str, data: dict = None):
    await manager.broadcast({
        "type": "notification",
        "notification_type": notification_type,
        "title": title,
        "message": message,
        "data": data or {},
        "timestamp": datetime.now().isoformat()
    })

