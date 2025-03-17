// src/models/Aluno.js
export class Aluno {
  constructor(
    id,
    nome,
    responsavel,
    telefoneResponsavel,
    idade,
    turma,
    createdAt
  ) {
    this.id = id;
    this.nome = nome;
    this.responsavel = responsavel;
    this.telefoneResponsavel = telefoneResponsavel;
    this.idade = idade;
    this.turma = turma;
    this.createdAt = createdAt;
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Aluno(
      doc.id,
      data.nome,
      data.responsavel,
      data.telefoneResponsavel,
      data.idade,
      data.turma,
      data.createdAt
    );
  }

  toFirestore() {
    return {
      nome: this.nome,
      responsavel: this.responsavel,
      telefoneResponsavel: this.telefoneResponsavel,
      idade: this.idade,
      turma: this.turma,
      createdAt: this.createdAt,
    };
  }
}
