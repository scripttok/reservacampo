// Representa um pagamento de uma turma
export class Pagamento {
  constructor(id, turmaId, valor, dataVencimento, dataPagamento, status) {
    this.id = id; // ID único no Firestore
    this.turmaId = turmaId; // Referência à Turma (ID)
    this.valor = valor; // Valor fixo mensal
    this.dataVencimento = dataVencimento; // Ex.: "2025-03-30"
    this.dataPagamento = dataPagamento; // Ex.: "2025-03-25" ou null
    this.status = status; // "pago", "pendente", "vencido"
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Pagamento(
      doc.id,
      data.turmaId,
      data.valor,
      data.dataVencimento,
      data.dataPagamento,
      data.status
    );
  }

  toFirestore() {
    return {
      turmaId: this.turmaId,
      valor: this.valor,
      dataVencimento: this.dataVencimento,
      dataPagamento: this.dataPagamento,
      status: this.status,
    };
  }
}
