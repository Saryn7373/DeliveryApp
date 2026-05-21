class Command:
    def execute(self) -> None:
        raise NotImplementedError


class TransitionOrderCommand(Command):
    def __init__(self, order, target_status: str):
        self.order = order
        self.target_status = target_status

    def execute(self) -> None:
        self.order.transition(self.target_status)


class OrderCommandInvoker:
    def __init__(self):
        self._history = []

    def run(self, command: Command) -> None:
        command.execute()
        self._history.append(command)

    def history(self) -> list:
        return [
            f"Заказ #{c.order.pk} → {c.target_status}"
            for c in self._history
        ]