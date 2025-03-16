// Representa uma turma/grupo que aluga um campo
export class Turma {
  constructor(id, nome, responsavel, telefone, campoId, dia, inicio, fim) {
    this.id = id; // ID único no Firestore
    this.nome = nome; // Ex.: "Turma do João"
    this.responsavel = responsavel; // Nome do responsável
    this.telefone = telefone; // Telefone do responsável
    this.campoId = campoId; // Referência ao Campo (ID)
    this.dia = dia; // Ex.: "Terça"
    this.inicio = inicio; // Ex.: "18:00"
    this.fim = fim; // Ex.: "19:30"
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Turma(
      doc.id,
      data.nome,
      data.responsavel,
      data.telefone,
      data.campoId,
      data.dia,
      data.inicio,
      data.fim
    );
  }

  toFirestore() {
    return {
      nome: this.nome,
      responsavel: this.responsavel,
      telefone: this.telefone,
      campoId: this.campoId,
      dia: this.dia,
      inicio: this.inicio,
      fim: this.fim,
    };
  }
}
