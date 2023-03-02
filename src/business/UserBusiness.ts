import { UserDatabase } from "../database/UserDatabase"
import { LoginInputDTO, LoginOutputDTO, SignupInputDTO, SignupOutputDTO } from "../dtos/userDTO";
import { BadRequestError } from "../errors/BadRequestError";
import { NotFoundError } from "../errors/NotFoundError";
import { User } from "../models/User";
import { HashManager } from "../services/HashManager";
import { IdGenerator } from "../services/IdGenerator";
import { TokenManager } from "../services/TokenManager";
import { TokenPayload, UserDB, USER_ROLES } from "../types";

export class UserBusiness {
    constructor(
        private userDatabase: UserDatabase,
        private idGenerator: IdGenerator,
        private tokenManager: TokenManager,
        private hashManager: HashManager
    ) {}

    public signup = async (input: SignupInputDTO): Promise<SignupOutputDTO> => {
        const {name, email, password} = input

        if (typeof name !== "string") {
            throw new BadRequestError("'name' deve ser string")
        }

        if (typeof email !== "string") {
            throw new BadRequestError("'email' deve ser string")
        }

        if (typeof password !== "string") {
            throw new BadRequestError("'password' deve ser string")
        }

        const hashPassword = await this.hashManager.hash(password)

        const newUser = new User(
            this.idGenerator.generate(),
            name,
            email,
            hashPassword,
            USER_ROLES.NORMAL,
            new Date().toISOString()
        )

        const userDB = newUser.toDBModel()

        await this.userDatabase.insert(userDB)

        const payload: TokenPayload = {
            id: newUser.getId(),
            name: newUser.getName(),
            role: newUser.getRole()
        }
        const output: SignupOutputDTO = {
            token: this.tokenManager.createToken(payload)
        }

        return output
    }

    public login = async (input: LoginInputDTO): Promise<LoginOutputDTO> => {
        const {email, password} = input

        if (typeof email !== "string") {
            throw new BadRequestError("'email' deve ser string")
        }

        if (typeof password !== "string") {
            throw new BadRequestError("'password' deve ser string")
        }

        const userDB: UserDB | undefined = await this.userDatabase.findByEmail(email)

        if(!userDB){
            throw new NotFoundError("'email' ou 'senha' invalidos")
        }
        const user = new User(
            userDB.id,
            userDB.name,
            userDB.email,
            userDB.password,
            userDB.role,
            userDB.created_at
        )

      const isPasswordCorrect = await this.hashManager.compare(password, user.getPassword())
        
      if(!isPasswordCorrect){
        throw new BadRequestError("'password' incorreto")
      }
      
      const payload: TokenPayload = {
        id: user.getId(),
        name: user.getName(),
        role: user.getRole()
      }
      
      const output: LoginOutputDTO = {
        token: this.tokenManager.createToken(payload)
    }
      
      return output
    }
}