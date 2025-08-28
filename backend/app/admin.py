from sqladmin import Admin, ModelView
from .database import engine
from .models import WorkSession, PriorityItem, ResourceLink

class WorkSessionAdmin(ModelView, model=WorkSession):
    name = "근무기록"
    column_list = [WorkSession.id, WorkSession.started_at, WorkSession.ended_at, WorkSession.minutes, WorkSession.memo]
    form_columns = [WorkSession.started_at, WorkSession.ended_at, WorkSession.memo]

class PriorityItemAdmin(ModelView, model=PriorityItem):
    name = "우선순위"
    column_list = "__all__"

class ResourceLinkAdmin(ModelView, model=ResourceLink):
    name = "링크"
    column_list = "__all__"

def setup_admin(app):
    admin = Admin(app, engine)
    admin.add_view(WorkSessionAdmin)
    admin.add_view(PriorityItemAdmin)
    admin.add_view(ResourceLinkAdmin)
